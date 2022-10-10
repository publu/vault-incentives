import axios from 'axios';
import path from 'path';

const { ethers, BigNumber } = require("ethers");
const { Provider } = require('ethcall');
const fs = require("fs");

let currentCalculation: any;

const {
    generateStartTime,
    getConfigFile,
    getConfigFilePath,
    getOuputDirPath,
    getLatestRun
} = require('./helpers/utils')

const {
  getBlocksAndIntervals,
  getBlocks
} = require("./helpers/blocks");

const {
  getVaultResults
} = require("./helpers/vault");


const { RPC } = require("./helpers/constants");
const Confirm = require("prompt-confirm");
const { formatDistanceToNowStrict, isBefore } = require("date-fns");
const { formatInTimeZone } = require("date-fns-tz");
const { getUnixTime } = require("date-fns/fp");
const oneWeek = 604800;

interface OwnerDebt {
  [address: string]: typeof BigNumber;
}

interface OwnerReward {
  [address: string]: typeof BigNumber;
}



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

const tenTo18 = BigNumber.from(10).pow(18);

const onlyChain = undefined;
const onlyVaultType = undefined;

// filters if runForVaults.length > 0
const runForVaults: any = [];
const excludeVaults: any = [];

const args = process.argv.slice(2);
let vaultIncentivesFile = args[0];

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


async function main(
  vaultAddress: any,
  vaultName: any,
  collateralDecimals: any,
  minCdr: any,
  maxCdr: any,
  startBlock: any,
  endBlock: any,
  blockInterval: any,
  rewardPerBlock: any,
  provider: any,
  extraRewards: any
) {


  let totalReward = BigNumber.from(0);

  const ownerReward: OwnerReward = {};

  let finalized = false;

  let blockNumber = startBlock;

  console.log("blockNumber: ", blockNumber);
  console.log("endBlock: ", endBlock);

  const vaultNameCheck = vaultName.replaceAll(" ", "_").replaceAll("/", "_");
  const fileNameToCheck = `${vaultNameCheck}-QI-rewards-${startBlock}-${endBlock}.json`;

  if (fs.existsSync(path.join(getOuputDirPath(currentCalculation), fileNameToCheck))) {
    console.log("skipping");
    return;
  }


  let totalDebt = BigNumber.from(0);
  let ownerDebt: OwnerDebt = {};

  while (!finalized) {
    const multicall = new Provider();
    await multicall.init(provider);

    const vaultResultsChunked = await getVaultResults(multicall, vaultAddress, blockNumber, endBlock);

    for (let i = 0; i < vaultResultsChunked.length; i++) {
      const [owner, collateral, debt, cdr_big] = vaultResultsChunked[i];

      let cdr;
      try {
        cdr = cdr_big.toNumber() / 100;
      } catch (e) {
        cdr = 0; // if cdr is too high it won't count either way. must be under 400 which is a number.
      }

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


      const reward = tenTo18
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
      finalized = true;
    }
  }

  if (extraRewards) {
    console.log("we got to here so let's see how many rewards we gotta give")

    //console.log(extraRewards)
    // support multiple extra rewards
    for (let i = 0; i < extraRewards.length; i++) {
      const reward_ = extraRewards[i];
      const fileVaultName = vaultName.replaceAll(" ", "_").replaceAll("/", "_")
      const weekAmount = BigNumber.from(reward_["rewardPerSecond"]).mul(BigNumber.from(oneWeek));
      const rewardFileName = `${vaultName}-${reward_["name"]}-rewards-${startBlock}-${endBlock}.json`;

      console.log("weekAmount: ", weekAmount)

      const ownerRewarders = Object.keys(ownerReward);

      //console.log("ownerRewarders: ", ownerRewarders)

      let extraRewarders: OwnerReward = {};

      console.log("ownerRewarders: ", ownerRewarders)

      for (let o = 0; o < ownerRewarders.length; o++) {
        const fraction = ownerReward[ownerRewarders[o]];
        extraRewarders[ownerRewarders[o]] = BigNumber.from(fraction)
            .mul(weekAmount).div(totalReward);
      }
      writeRewardData(JSON.stringify({
        details: {
          chainId: provider._network.chainId,
          rewardToken: reward_["address"],
          vaultAddress,
          startBlock,
          endBlock,
          weekAmount,
        },
        values: extraRewarders,
      }), rewardFileName, currentCalculation);
  
    }
  }

  if (rewardPerBlock.gt(0)) {

    const owners = Object.keys(ownerReward);

    /*
      We multipy by 1e18 and the divide so we can get a greater accuracy
    */
    for (let o = 0; o < owners.length; o++) {
      ownerReward[owners[o]] = ownerReward[owners[o]].mul(rewardPerBlock).div(tenTo18);
    }

    let fileName = `${vaultName}-QI-rewards-${startBlock}-${endBlock}.json`;
    writeRewardData(JSON.stringify({
      details: {
        chainId: provider._network.chainId,
        vaultAddress,
        startBlock,
        endBlock,
        total: totalReward.mul(rewardPerBlock).div(tenTo18),
      },
      values: ownerReward,
    }), fileName, currentCalculation);

  }

}

let incentiveData;// = JSON.parse(fs.readFileSync(vaultIncentivesFilePath));

let vIncentives;

(async () => {

  let calculated;
  if (!vaultIncentivesFile) {

    let latestRun = getLatestRun();
    let isWeekOdd = (latestRun % 2);

    currentCalculation = latestRun + 1

    if (!isWeekOdd) {
      console.log("last ran was an odd week: ", latestRun);
      // we just grab the latest config json
      incentiveData = getConfigFile(latestRun)
    } else {
      console.log("new vault incentive config")
      // we create a new config from the api
      await axios
        .get('https://api.mai.finance/v2/vaultIncentives')
        .then((res: any) => {
          fs.writeFileSync(getConfigFilePath(latestRun + 1), JSON.stringify(res.data), function (err: any) {
            if (err) return console.log(err);
          });
          incentiveData = getConfigFile(latestRun + 1);
        })
        .catch((error: any) => {
          console.error(error);
        });
    }

    let dir = getOuputDirPath(latestRun + 1);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    console.log("rewards for week " + (latestRun + 1));

  } else {

    let isWeekOdd = ((Number(vaultIncentivesFile)) % 2);
    let vaultIncentivesFile2 = (!isWeekOdd) ? vaultIncentivesFile : (Number(vaultIncentivesFile) - 1)
    incentiveData = getConfigFile(Number(vaultIncentivesFile2));
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
  )}) making the start date ${formatDistanceToNowStrict(purposedStartDate)} ${isBefore(purposedStartDate, curDate) ? "before" : "after"
    } today, is that correct?`;

  const prompt = await new Confirm(promptString).run();

  if (!prompt) {
    console.log("Exiting...");
    return -1;
  }

  const startDate = getUnixTime(purposedStartDate);

  const endDate = startDate + oneWeek;

  // need to process the list of chains by name of object from the config:
  const startBlocks = await getBlocks(startDate);
  const endBlocks = await getBlocks(endDate);
  console.log("startBlocks ", startBlocks);
  console.log("endBlocks ", endBlocks);

  const { blocks, blockIntervals } = getBlocksAndIntervals(startBlocks, endBlocks);

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

  for (let chainId of Object.keys(vIncentives)) {
    if (onlyChain && chainId !== onlyChain) continue
    const incentives = vIncentives[chainId];

    console.log("Using: ", RPC[chainId]);

    const provider = new ethers.providers.JsonRpcProvider(
      RPC[chainId],
      parseInt(chainId)
    );

    const validIncentives = incentives.filter((incentive: any) => {
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

      const before: any = new Date();

      const rewardPerBlock = BigNumber.from(incentive.rewardPerSecond)
        .mul(BigNumber.from(oneWeek))
        .div(BigNumber.from(blocks[chainId][1] - blocks[chainId][0]));
      // reward per week / blocks per week
      const vault_name = incentive.name.replaceAll(" ", "_").replaceAll("/", "_")
      await main(
        incentive.vaultAddress,
        vault_name,
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

      const after: any = new Date();

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



/* HELPER FUNCTIONS */


function writeRewardData(output: any, fileName: string, week: number) {
  fs.writeFileSync(path.join(getOuputDirPath(week), fileName), output);
}