// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'ethers'.
const { ethers, BigNumber } = require("ethers");
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'fs'.
const fs = require("fs");

async function rewards_to_json_csv() {
  const startBlock_ = process.argv[2];
  const endBlock_ = process.argv[3];
  const rewardAddress = {
    ["1"]: "0x559b7bfC48a5274754b08819F75C5F27aF53D53b",
    ["10"]: "0x3F56e0c36d275367b8C502090EDF38289b3dEa0d",
    ["56"]: "0xdDC3D26BAA9D2d979F5E2e42515478bf18F354D5",
    ["100"]: "0xdFA46478F9e5EA86d57387849598dbFB2e964b02",
    ["137"]: "0x580A84C73811E1839F75d86d75d88cCa0c241fF4",
    ["250"]: "0x68Aa691a8819B07988B18923F712F3f4C8d36346",
    ["1088"]: "0x3F56e0c36d275367b8C502090EDF38289b3dEa0d",
    ["42161"]: "0xb9c8f0d3254007ee4b98970b94544e473cd610ec",
    ["43114"]: "0xA56F9A54880afBc30CF29bB66d2D9ADCdcaEaDD6"
  }
  const files = process.argv.slice(4);

  let includedVaults = {};
  let finalOwnerRewards = {};

  let chainBlocks = {};

  let rewardsPerChainAndToken = {};
  let rewardsPerChainAndTokenCalculated = {};


  for (let file of files) {
    if(!file.includes("DS_Store")){

      let data = JSON.parse(fs.readFileSync(file));
      const {
        details: { chainId, vaultAddress, rewardToken, startBlock, endBlock, total },
        values,
      } = data;

      if(total){
        console.log(file, " ", BigNumber.from(total).toString())
      }

      let rewardTokenAddress;

      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      if(!chainBlocks[chainId]){
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        chainBlocks[chainId] = {};
      }
      if(!rewardToken){
        // its QI
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        rewardTokenAddress = rewardAddress[chainId];
      }else{
        rewardTokenAddress = rewardToken
      }
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      if (!finalOwnerRewards[chainId]) {
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        finalOwnerRewards[chainId] = {};
      }
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      if (!includedVaults[chainId]) {
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        includedVaults[chainId] = [];
      }

      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      if (!finalOwnerRewards[chainId][rewardTokenAddress]) {
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        finalOwnerRewards[chainId][rewardTokenAddress] = {};
      }
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      if (!includedVaults[chainId][rewardTokenAddress]) {
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        includedVaults[chainId][rewardTokenAddress] = [];
      }

      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      if(!rewardsPerChainAndTokenCalculated[chainId]) {
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        rewardsPerChainAndTokenCalculated[chainId] = {}//BigNumber.from(0)
      }

      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      if(!rewardsPerChainAndTokenCalculated[chainId][rewardTokenAddress]) {
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        rewardsPerChainAndTokenCalculated[chainId][rewardTokenAddress] = BigNumber.from(0)
      }

      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      if(!rewardsPerChainAndToken[chainId]){
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        rewardsPerChainAndToken[chainId] = BigNumber.from(0)
      }

      if(total){
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        rewardsPerChainAndToken[chainId] = rewardsPerChainAndToken[chainId].add(BigNumber.from(total));
      }

      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      chainBlocks[chainId]["startBlock"] = startBlock
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      chainBlocks[chainId]["endBlock"] = endBlock

      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      includedVaults[chainId].push(vaultAddress);
      const vaultOwners = Object.keys(values);
      for (let i = 0; i < vaultOwners.length; i++) {
        const vaultOwner = vaultOwners[i];

        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        if (finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner] !== undefined) {
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner] = finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner].add(
            values[vaultOwner]
          );
        } else {
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          console.log("else: ", finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner])
          try{
            // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner] = BigNumber.from(values[vaultOwner]);
          } catch (e) {
            console.log("error? ", e) 
          }
        }
      }
    }
  }
  const chains = Object.keys(finalOwnerRewards);

//  console.log("chains: ",  chains);
//  console.log("finalOwnerRewards: ", finalOwnerRewards);

  let total = {};//BigNumber.from(0);

  let formattedFinalOwnerRewards = {};
  let bnFormattedFinalOwnerRewards = {};

  for (let chainId of chains) {
    //console.log(chainId)
    
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    const rewards = Object.keys(finalOwnerRewards[chainId]);

    for(let rewardTokenAddress of rewards) {

      //console.log("rewardTokenAddress: ",rewardTokenAddress)

      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      const vaultOwners = Object.keys(finalOwnerRewards[chainId][rewardTokenAddress])

      for (let vaultOwner of vaultOwners) {
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        if (!formattedFinalOwnerRewards[chainId]) {
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          formattedFinalOwnerRewards[chainId] = {}
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          bnFormattedFinalOwnerRewards[chainId] = {}
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          total[chainId] = {}
        }

        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        if (!formattedFinalOwnerRewards[chainId][rewardTokenAddress]) {
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          formattedFinalOwnerRewards[chainId][rewardTokenAddress] = {}
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          bnFormattedFinalOwnerRewards[chainId][rewardTokenAddress] = {}
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          total[chainId][rewardTokenAddress] = BigNumber.from(0);
        }

        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        total[chainId][rewardTokenAddress] = total[chainId][rewardTokenAddress].add(finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner]);

        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        rewardsPerChainAndTokenCalculated[chainId][rewardTokenAddress] = rewardsPerChainAndTokenCalculated[chainId][rewardTokenAddress].add(finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner])

        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        formattedFinalOwnerRewards[chainId][rewardTokenAddress][vaultOwner.toLowerCase()] = parseFloat(
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          ethers.utils.formatUnits(finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner])
        );
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        bnFormattedFinalOwnerRewards[chainId][rewardTokenAddress][vaultOwner.toLowerCase()] = 
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          ethers.utils.formatUnits(finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner])
        ;
      }
    }
  }

  for (let chainId of Object.keys(formattedFinalOwnerRewards)) {

    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    for (let rewardTokenAddress of Object.keys(formattedFinalOwnerRewards[chainId])) {

      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      let startBlock = chainBlocks[chainId]["startBlock"]
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      let endBlock = chainBlocks[chainId]["endBlock"]
      
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      const vaultOwners = Object.keys(finalOwnerRewards[chainId][rewardTokenAddress])
      const jsonOutput = JSON.stringify({
    details: {
        chainId,
        rewardAddress: rewardTokenAddress,
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        total: parseFloat(ethers.utils.formatUnits(total[chainId][rewardTokenAddress])),
        startBlock,
        endBlock,
        includedVaults,
        nVaultsIncluded: (includedVaults as any).length,
    },
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    values: formattedFinalOwnerRewards[chainId][rewardTokenAddress],
});

      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      let rewardAddressInCSV = (rewardTokenAddress=="0x3F56e0c36d275367b8C502090EDF38289b3dEa0d") ? rewardAddress[chainId] : rewardTokenAddress;

      const JsonFileName = `${chainId}-${rewardAddressInCSV}-vault-rewards-${startBlock}-${endBlock}-api.json`;
      const CsvFileName = `${chainId}-${rewardAddressInCSV}-vault-rewards-${startBlock}-${endBlock}-gnosis.csv`;

      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      if(total[chainId][rewardTokenAddress] > 0){
        fs.writeFileSync(JsonFileName, jsonOutput);

        const gnosisOutputLines = [];

        for (let i = 0; i < vaultOwners.length; i++) {
          const vaultOwner = vaultOwners[i];
          gnosisOutputLines.push(
            `erc20,${rewardAddressInCSV},${vaultOwner},${            
// @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
bnFormattedFinalOwnerRewards[chainId][rewardTokenAddress][vaultOwner.toLowerCase()]
            },`
          );
        }

        fs.writeFileSync(CsvFileName, gnosisOutputLines.join("\n")); 
      }

    }
  }
  console.log("Rewards: ")
  for(let chain of Object.keys(rewardsPerChainAndToken)){
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    console.log(chain, ": ", ethers.utils.formatUnits(rewardsPerChainAndToken[chain]).toString() )
  }
  console.log("Calculated Rewards: ")
  for(let chain of Object.keys(rewardsPerChainAndTokenCalculated)){
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    for(let reward of Object.keys(rewardsPerChainAndTokenCalculated[chain])){
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      console.log(chain, ": ", ethers.utils.formatUnits(rewardsPerChainAndTokenCalculated[chain][reward]).toString() )
    }
  }
  console.log("Done:)");
}

rewards_to_json_csv();
