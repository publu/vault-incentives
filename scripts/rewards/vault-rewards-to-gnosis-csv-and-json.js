const { ethers, BigNumber } = require("ethers");
const fs = require("fs");

async function main() {
  const startBlock_ = process.argv[2];
  const endBlock_ = process.argv[3];
  const rewardAddress = {
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

      if(!chainBlocks[chainId]){
        chainBlocks[chainId] = {};
      }
      if(!rewardToken){
        // its QI
        rewardTokenAddress = rewardAddress[chainId];
      }else{
        rewardTokenAddress = rewardToken
      }
      if (!finalOwnerRewards[chainId]) {
        finalOwnerRewards[chainId] = {};
      }
      if (!includedVaults[chainId]) {
        includedVaults[chainId] = [];
      }

      if (!finalOwnerRewards[chainId][rewardTokenAddress]) {
        finalOwnerRewards[chainId][rewardTokenAddress] = {};
      }
      if (!includedVaults[chainId][rewardTokenAddress]) {
        includedVaults[chainId][rewardTokenAddress] = [];
      }

      if(!rewardsPerChainAndTokenCalculated[chainId]) {
        rewardsPerChainAndTokenCalculated[chainId] = {}//BigNumber.from(0)
      }

      if(!rewardsPerChainAndTokenCalculated[chainId][rewardTokenAddress]) {
        rewardsPerChainAndTokenCalculated[chainId][rewardTokenAddress] = BigNumber.from(0)
      }

      if(!rewardsPerChainAndToken[chainId]){
        rewardsPerChainAndToken[chainId] = BigNumber.from(0)
      }

      if(total){
        rewardsPerChainAndToken[chainId] = rewardsPerChainAndToken[chainId].add(BigNumber.from(total));
      }

      chainBlocks[chainId]["startBlock"] = startBlock
      chainBlocks[chainId]["endBlock"] = endBlock

      includedVaults[chainId].push(vaultAddress);
      const vaultOwners = Object.keys(values);
      for (let i = 0; i < vaultOwners.length; i++) {
        const vaultOwner = vaultOwners[i];

        if (finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner] !== undefined) {
          finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner] = finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner].add(
            values[vaultOwner]
          );
        } else {
          console.log("else: ", finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner])
          try{
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
    
    const rewards = Object.keys(finalOwnerRewards[chainId]);

    for(let rewardTokenAddress of rewards) {

      //console.log("rewardTokenAddress: ",rewardTokenAddress)

      const vaultOwners = Object.keys(finalOwnerRewards[chainId][rewardTokenAddress])

      for (let vaultOwner of vaultOwners) {
        if (!formattedFinalOwnerRewards[chainId]) {
          formattedFinalOwnerRewards[chainId] = {}
          bnFormattedFinalOwnerRewards[chainId] = {}
          total[chainId] = {}
        }

        if (!formattedFinalOwnerRewards[chainId][rewardTokenAddress]) {
          formattedFinalOwnerRewards[chainId][rewardTokenAddress] = {}
          bnFormattedFinalOwnerRewards[chainId][rewardTokenAddress] = {}
          total[chainId][rewardTokenAddress] = BigNumber.from(0);
        }

        total[chainId][rewardTokenAddress] = total[chainId][rewardTokenAddress].add(finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner]);

        rewardsPerChainAndTokenCalculated[chainId][rewardTokenAddress] = rewardsPerChainAndTokenCalculated[chainId][rewardTokenAddress].add(finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner])

        formattedFinalOwnerRewards[chainId][rewardTokenAddress][vaultOwner.toLowerCase()] = parseFloat(
          ethers.utils.formatUnits(finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner])
        );
        bnFormattedFinalOwnerRewards[chainId][rewardTokenAddress][vaultOwner.toLowerCase()] = 
          ethers.utils.formatUnits(finalOwnerRewards[chainId][rewardTokenAddress][vaultOwner])
        ;
      }
    }
  }

  for (let chainId of Object.keys(formattedFinalOwnerRewards)) {

    for (let rewardTokenAddress of Object.keys(formattedFinalOwnerRewards[chainId])) {

      let startBlock = chainBlocks[chainId]["startBlock"]
      let endBlock = chainBlocks[chainId]["endBlock"]
      
      const vaultOwners = Object.keys(finalOwnerRewards[chainId][rewardTokenAddress])
      const jsonOutput = JSON.stringify({
        details: {
          chainId,
          rewardAddress: rewardTokenAddress,
          total: parseFloat(ethers.utils.formatUnits(total[chainId][rewardTokenAddress])),
          startBlock,
          endBlock,
          includedVaults,
          nVaultsIncluded: includedVaults.length,
        },
        values: formattedFinalOwnerRewards[chainId][rewardTokenAddress],
      });

      const JsonFileName = `${chainId}-${rewardTokenAddress}-vault-rewards-${startBlock}-${endBlock}-api.json`;
      const CsvFileName = `${chainId}-${rewardTokenAddress}-vault-rewards-${startBlock}-${endBlock}-gnosis.csv`;

      if(total[chainId][rewardTokenAddress] > 0){
        fs.writeFileSync(JsonFileName, jsonOutput);

        const gnosisOutputLines = [];

        for (let i = 0; i < vaultOwners.length; i++) {
          const vaultOwner = vaultOwners[i];
          gnosisOutputLines.push(
            `erc20,${rewardAddress[chainId]},${vaultOwner},${bnFormattedFinalOwnerRewards[chainId][rewardTokenAddress][vaultOwner.toLowerCase()]
            },`
          );
        }

        fs.writeFileSync(CsvFileName, gnosisOutputLines.join("\n")); 
      }

    }
  }
  console.log("Rewards: ")
  for(let chain of Object.keys(rewardsPerChainAndToken)){
    console.log(chain, ": ", rewardsPerChainAndToken[chain].toString())
  }
  console.log("Calculated Rewards: ")
  for(let chain of Object.keys(rewardsPerChainAndTokenCalculated)){
    for(let reward of Object.keys(rewardsPerChainAndTokenCalculated[chain])){
      console.log(chain, ": ", rewardsPerChainAndTokenCalculated[chain][reward].toString())
    }
  }
  console.log("Done:)");
}

main();
