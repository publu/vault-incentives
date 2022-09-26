const Erc20Stablecoin = require("../../abis/erc20Stablecoin.json");
const QiStablecoin = require("../../abis/QiStablecoin.json");
const { ethers, BigNumber } = require("ethers");
const { Contract, Provider } = require("ethcall");
const fs = require("fs");
const axios = require('axios');
let currentCalculation;

const {
  sleep,
  splitToChunks,
  chunkArray,
  generateStartTime,
} = require("./utils");
const { RPC } = require("./constants");
const { request, gql } = require("graphql-request");
const Confirm = require("prompt-confirm");
const { formatDistanceToNowStrict, isBefore } = require("date-fns");
const { formatInTimeZone } = require("date-fns-tz");
const { getUnixTime } = require("date-fns/fp");
const oneWeek = 604800;

// Every X blocks, check qualifying vaults.
// Price - getEthPriceSource()
// Get every vault's collateral, debt, and owner.
// (collateral * price) / debt = cdr
// ownerDebt[owner] += debt
// totalDebt += debt
// for owner in Object.keys(ownerDebt):
//   totalOwnerReward[owner] += ownerDebt[owner] * qi_per_block / totalDebt
/*
const vaultIncentivesFilePath = args[0];

const incentiveData = JSON.parse(fs.readFileSync(vaultIncentivesFilePath));

const vIncentives = incentiveData;
*/
const onlyChain = undefined;
const onlyVaultType = undefined; 

// filters if runForVaults.length > 0
const runForVaults = [];
const excludeVaults = [];

const args = process.argv.slice(2);

console.log(args)

const vaultIncentivesFile = args[0];

// Arguments
// collateralDecimals - collateral / debt normalization
// provider - ethers JsonRPCProvider w/ archival node
//
//   address: "",
//   rewardPerBlock: BigNumber.from(),
//   minCdr: 1.55,
//   maxCdr: 4,
//
// startBlock
// endBlock
// blockInterval - N blocks per run (100. e.g. snapshots every 100 blocks between startBlock and endBlock and interpolates rewards)

async function tryGetMulticallResults(
  multicall,
  calls,
  repeatOnFail,
  block,
  repeatDelayMs = 10000
) {
  while (true) {
    try {
      const results = await multicall.all(calls, block);
      return results;
    } catch (e) {
      console.log(e);
      if (repeatOnFail) {
        console.log("Errored.");
        console.log(`Waiting ${repeatDelayMs} ms and retrying.`);
        await sleep(repeatDelayMs);
      } else {
        return;
      }
    }
  }
}

async function main(
  vaultAddress,
  vaultName,
  collateralDecimals,
  minCdr,
  maxCdr,
  startBlock,
  endBlock,
  blockInterval,
  rewardPerBlock,
  provider,
  extraRewards
) {
  const isMaticVault =
    vaultAddress.toLowerCase() == "0xa3fa99a148fa48d14ed51d610c367c61876997f1";
  const multicall = new Provider();
  await multicall.init(provider);

  const vaultContract = new Contract(
    vaultAddress,
    isMaticVault ? QiStablecoin.abi : Erc20Stablecoin
  );
  const nftContract = new Contract(
    isMaticVault ? "0x6AF1d9376a7060488558cfB443939eD67Bb9b48d" : vaultAddress,
    Erc20Stablecoin
  );

  let totalReward = BigNumber.from(0);
  const ownerReward = {};

  let finalized = false;
  let skip = false;

  let blockNumber = startBlock;

  console.log("blockNumber: ", blockNumber);

  console.log("endBlock: ", endBlock);

  const fileNameToCheck = `week${currentCalculation}/${vaultName}-QI-rewards-${startBlock}-${endBlock}.json`.replace(" ","_");

  if (fs.existsSync(fileNameToCheck)) {
    console.log("skipping");
    finalized = true;
    skip = true;
  }

  let ownerDebtGlobal;
  let totalDebtGlobal;

  while (!finalized) {
    const [price] = await tryGetMulticallResults(
      multicall,
      [vaultContract.getEthPriceSource()],
      true,
      blockNumber
    );

    const [totalSupply] = await tryGetMulticallResults(
      multicall,
      [nftContract.vaultCount()],
      true,
      endBlock
    );

    const nVaults = parseInt(totalSupply.toString());
    let existingVaults = [];

    let vaultExistsCalls = [];

    for (let i = 0; i < nVaults; i++) {
      vaultExistsCalls.push(
        isMaticVault ? vaultContract.vaultExistence(i) : vaultContract.exists(i)
      );
    }

    let vaultExistsCallsChunked = chunkArray(vaultExistsCalls, 500);
    const vaultExistsResults = [];

    for (let i = 0; i < vaultExistsCallsChunked.length; i++) {
      const calls = vaultExistsCallsChunked[i];
      const results = await tryGetMulticallResults(
        multicall,
        calls,
        true,
        blockNumber
      );
      vaultExistsResults.push(...results);
    }

    for (let i = 0; i < vaultExistsResults.length; i++) {
      if (vaultExistsResults[i]) {
        existingVaults.push(i);
      }
    }

    let vaultCalls = [];

    for (let i = 0; i < existingVaults.length; i++) {
      const vault = existingVaults[i];
      vaultCalls.push(nftContract.ownerOf(vault));
      vaultCalls.push(vaultContract.vaultCollateral(vault));
      vaultCalls.push(vaultContract.vaultDebt(vault));
      vaultCalls.push(vaultContract.checkCollateralPercentage(vault));
    }

    const vaultCallsChunked = chunkArray(vaultCalls, 500);

    let vaultResults = [];

    for (let i = 0; i < vaultCallsChunked.length; i++) {
      let done = false;
      const calls = vaultCallsChunked[i];
      while (!done) {
        try {
          const results = await tryGetMulticallResults(
            multicall,
            calls,
            true,
            blockNumber
          );
          vaultResults.push(...results);
          done = true;
        } catch (e) {
          console.log("Error", e);
          console.log(vaultCallsChunked[i]);
          sleep(1000);
          console.log("Errored. Retrying.");
        }
      }
    }

    const vaultResultsChunked = splitToChunks(
      vaultResults,
      existingVaults.length
    );

    let totalDebt = BigNumber.from(0);
    let ownerDebt = {};

    for (let i = 0; i < vaultResultsChunked.length; i++) {
      const [owner, collateral, debt, cdr_big] = vaultResultsChunked[i];
      const cdr_ =
        parseInt(collateral.mul(price).div("100000000")) /
        parseInt(
          debt.div(BigNumber.from(10).pow(18 - collateralDecimals)).toString()
        );

      let cdr;
      try {
        cdr = cdr_big.toNumber() / 100;
      } catch (e){
        cdr = 0; // if cdr is too high it won't count either way. must be under 400 which is a number.
      }

      console.log("cdr: ", cdr);

      if (cdr >= minCdr && cdr <= maxCdr) {
        totalDebt = totalDebt.add(debt);
        if (ownerDebt[owner]) {
          ownerDebt[owner] = ownerDebt[owner].add(debt);
        } else {
          ownerDebt[owner] = debt;
        }
      }
    }

    const countedBlocks =
      endBlock - blockInterval > blockNumber
        ? blockInterval
        : endBlock - blockNumber;

    const owners = Object.keys(ownerDebt);
    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i];
      const debt = ownerDebt[owner];
      const reward = BigNumber.from(rewardPerBlock)
        .mul(countedBlocks)
        .mul(debt)
        .div(totalDebt);
      if (ownerReward[owner]) {
        ownerReward[owner] = ownerReward[owner].add(reward);
      } else {
        ownerReward[owner] = reward;
      }
      totalReward = totalReward.add(reward);
    }

    console.log(
      `${vaultName}: ${(
        (1 - (endBlock - blockNumber) / (endBlock - startBlock)) *
        100
      ).toFixed(2)}%`
    );

    if (blockNumber < endBlock) {
      if (blockNumber + blockInterval > endBlock) {
        blockNumber = endBlock;
      } else {
        blockNumber += blockInterval;
      }
    } else {
      ownerDebtGlobal = ownerDebt;
      totalDebtGlobal = totalDebt;
      finalized = true;
    }
  }

  if (!skip) {
    let total = BigNumber.from(0);
    const owners = Object.keys(ownerReward);
    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i];
      total = total.add(ownerReward[owner]);
    }

    if(extraRewards) {
      console.log("we got to here so let's see how many rewards we gotta give")

      //console.log(extraRewards)
      // support multiple extra rewards
      for (let i = 0; i < extraRewards.length; i++) {
        const reward_= extraRewards[i];
        const fileVaultName = vaultName.replace(" ","_")
        const weekAmount = BigNumber.from(reward_["rewardPerSecond"]).mul(BigNumber.from(oneWeek));
        const rewardFileName = `./week${currentCalculation}/${vaultName}-${reward_["name"]}-rewards-${startBlock}-${endBlock}.json`;

        const ownerRewarders = Object.keys(ownerDebtGlobal);
        
        let extraRewarders = {};

        for(let o=0; o < ownerRewarders.length; o++){
          const fraction = ownerDebtGlobal[ownerRewarders[o]];
          extraRewarders[ownerRewarders[o]] = BigNumber.from(fraction).mul(weekAmount).div(totalDebtGlobal);
        }
        const extraReward = JSON.stringify({
          details: {
            chainId: provider._network.chainId,
            rewardToken: reward_["address"],
            vaultAddress,
            startBlock,
            endBlock,
            weekAmount,
          },
          values: extraRewarders,
        });

        fs.writeFileSync(rewardFileName, extraReward);
      }
    }

    let fileName = `./week${currentCalculation}/${vaultName}-QI-rewards-${startBlock}-${endBlock}.json`;
    fileName = fileName.replace(" ","_");

    const output = JSON.stringify({
      details: {
        chainId: provider._network.chainId,
        vaultAddress,
        startBlock,
        endBlock,
        total,
      },
      values: ownerReward,
    });
    fs.writeFileSync(fileName, output);
  }
}

let incentiveData;// = JSON.parse(fs.readFileSync(vaultIncentivesFilePath));

let vIncentives;

(async () => {

  let calculated;
  if(!vaultIncentivesFile){
    calculated = fs.readdirSync("./")
                  .filter(calculated => String(calculated).startsWith('week'))
                  .map(item => item.replace("week", ""))
                  .filter(item => Number(item))
                  .map(item => Number(item))


    let latestRun = Math.max(...calculated);
    let isWeek1 = (latestRun % 2);

    currentCalculation = latestRun+1

    if(!isWeek1){
      console.log("last ran was week1")
      // we just grab the latest config json
      incentiveData = JSON.parse(fs.readFileSync("configs/week" + latestRun + ".json"))
    } else {
      console.log("new vault incentive config")
      // we create a new config from the api
      await axios
        .get('https://api.mai.finance/v2/vaultIncentives')
        .then(res => {
          fs.writeFileSync("configs/week" + (latestRun+1) + ".json", JSON.stringify(res.data), function (err) {
            if (err) return console.log(err);
          });
          incentiveData = JSON.parse(fs.readFileSync("configs/week" + (latestRun+1) + ".json"))
        })
        .catch(error => {
          console.error(error);
        });
    }

    let dir = "week" + (latestRun+1);

    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
    console.log("rewards for week " + (latestRun+1) );

  } else{

    let isWeek1 = ((Number(vaultIncentivesFile)) % 2);
    let vaultIncentivesFile = (isWeek1) ? vaultIncentivesFile : (Number(vaultIncentivesFile) - 1)
    incentiveData = JSON.parse(fs.readFileSync("configs/week" + (vaultIncentivesFile) + ".json"))
    currentCalculation = vaultIncentivesFile;
  }

  vIncentives = incentiveData;

  const curDate = new Date();
  const purposedStartDate = generateStartTime(curDate); // Override TS HERE

  const promptString = `This reward period will start from [${formatInTimeZone(
    purposedStartDate,
    "UTC",
    "P KK:mma O"
  )}](Unix TS:${getUnixTime(
    purposedStartDate
  )}) making the start date ${formatDistanceToNowStrict(purposedStartDate)} ${
    isBefore(purposedStartDate, curDate) ? "before" : "after"
  } today, is that correct?`;

  const prompt = await new Confirm(promptString).run();

  if (!prompt) {
    console.log("Exiting...");
    return -1;
  }

  const startDate = getUnixTime(purposedStartDate);

  const endDate = startDate + oneWeek;

  // need to process the list of chains by name of object from the config:

  const startBlockQuery =
    gql`
  {
    blocks (where: { ts: ` +
    startDate +
    `, network_in: ["100", "10", "56", "137", "250", "1088", "42161", "43114"] }) {
      network
      number
    }
  }
  `;
  const startBlocks = (
    await request("https://blockfinder.snapshot.org/graphql", startBlockQuery)
  ).blocks;

  const endBlockQuery =
    gql`
  {
    blocks (where: { ts: ` +
    endDate +
    `, network_in: ["100", "10", "56", "100", "137", "250", "1088", "42161", "43114"] }) {
      network
      number
    }
  }
  `;
  const endBlocks = (
    await request("https://blockfinder.snapshot.org/graphql", endBlockQuery)
  ).blocks;

  console.log("startBlocks ", startBlocks);
  console.log("endBlocks ", endBlocks);

  var blocks = {};
  var blockIntervals = {};

  for (const x of startBlocks) {
    blocks[x.network] = [];
    blocks[x.network].push(x.number);

    for (const y of endBlocks) {
      if (x.network == y.network) {
        blocks[x.network].push(y.number);

        /*
          1 week divided by 3 hour, in seconds = 56
          this lets us get the average "blocks" per 3 hours.
          YMMV. we just want a blockTag for the RPC endpoint.
        */

        blockIntervals[x.network] = Math.floor((y.number - x.number) / 56);
      }
    }
  }

  console.log("blocks: ", blocks);

  console.log("blockIntervals: ", blockIntervals);
  /*
  const blocks = {
    [ChainId.MATIC]: [27791091, 28052909],
    [ChainId.FANTOM]: [37321929, 37797583],
  };
  */

  // why aren't the block intervals derived from what a presumed week in blocks is?
  /*
  const blockIntervals = {
    [ChainId.MATIC]: 3500, // Polygon ~3h at 2.2 second block-time
    [ChainId.FANTOM]: 11880, // Fantom ~3h at 1 second block-time
  };
  */

  for (chainId of Object.keys(vIncentives)) {
    if (onlyChain && chainId !== onlyChain) continue

    const incentives = vIncentives[chainId];
    console.log("Using: ", RPC[chainId]);
    const provider = new ethers.providers.JsonRpcProvider(
      RPC[chainId],
      parseInt(chainId)
    );

    const validIncentives = incentives.filter((incentive) => {
      if (runForVaults.length > 0) {
        return runForVaults.includes(incentive.name);
      }
      if (excludeVaults.length > 0) {
        return !excludeVaults.includes(incentive.name);
      }
      return true;
    });

    for (let i in validIncentives) {
      const incentive = validIncentives[i];
      if (onlyVaultType && incentive.name !== onlyVaultType) continue

      console.log(`Starting vault incentive script for ${incentive.name}`);
      const before = new Date();

      const rewardPerBlock = BigNumber.from(incentive.rewardPerSecond)
        .mul(BigNumber.from(oneWeek))
        .div(BigNumber.from(blocks[chainId][1] - blocks[chainId][0]));
      // reward per week / blocks per week

      await main(
        incentive.vaultAddress,
        incentive.name,
        incentive.collateralDecimals,
        incentive.minCdr,
        incentive.maxCdr,
        blocks[chainId][0],
        blocks[chainId][1],
        blockIntervals[chainId],
        rewardPerBlock,
        provider,
        incentive.extraRewards
      );

      const after = new Date();

      console.log(
        `Finished ${incentive.name} vault reward script in ${(
          (after - before) /
          1000 /
          60
        ).toFixed(2)} minutes`
      );
    }
  }
})();
