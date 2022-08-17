const { ethers, BigNumber } = require("ethers");
const fs = require("fs");

async function main() {
  const startBlock = process.argv[2];
  const endBlock = process.argv[3];
  const rewardAddress = {
    ["10"]: "0x3F56e0c36d275367b8C502090EDF38289b3dEa0d",
    ["56"]: "0xdDC3D26BAA9D2d979F5E2e42515478bf18F354D5",
    ["100"]: "0xdFA46478F9e5EA86d57387849598dbFB2e964b02",
    ["137"]: "0x580A84C73811E1839F75d86d75d88cCa0c241fF4",
    ["250"]: "0x68Aa691a8819B07988B18923F712F3f4C8d36346",
    ["1088"]: "0x3F56e0c36d275367b8C502090EDF38289b3dEa0d"
    ["42161"]: "0xb9c8f0d3254007ee4b98970b94544e473cd610ec",
    ["43114"]: "0xA56F9A54880afBc30CF29bB66d2D9ADCdcaEaDD6"
  }
  const files = process.argv.slice(4);

  let includedVaults = {};
  let finalOwnerRewards = {};

  for (let file of files) {
    let data = JSON.parse(fs.readFileSync(file));
    const {
      details: { chainId, vaultAddress },
      values,
    } = data;
    if (!finalOwnerRewards[chainId]) {
      finalOwnerRewards[chainId] = {};
    }
    if (!includedVaults[chainId]) {
      includedVaults[chainId] = [];
    }
    includedVaults[chainId].push(vaultAddress);
    const vaultOwners = Object.keys(values);
    for (let i = 0; i < vaultOwners.length; i++) {
      const vaultOwner = vaultOwners[i];
      if (finalOwnerRewards[chainId][vaultOwner]) {
        finalOwnerRewards[chainId][vaultOwner] = finalOwnerRewards[chainId][vaultOwner].add(
          values[vaultOwner]
        );
      } else {
        try{
          finalOwnerRewards[chainId][vaultOwner] = BigNumber.from(values[vaultOwner]);
        } catch (e) {
          
        }
      }
    }
  }

  const chains = Object.keys(finalOwnerRewards);

  let total = BigNumber.from(0);
  let formattedFinalOwnerRewards = {};
  let bnFormattedFinalOwnerRewards = {};
  for (let chainId of chains) {
    console.log(chainId)
    const vaultOwners = Object.keys(finalOwnerRewards[chainId])
    for (let vaultOwner of vaultOwners) {
      total = total.add(finalOwnerRewards[chainId][vaultOwner]);
      if (!formattedFinalOwnerRewards[chainId]) {
        formattedFinalOwnerRewards[chainId] = {}
	bnFormattedFinalOwnerRewards[chainId] = {}
      }
      formattedFinalOwnerRewards[chainId][vaultOwner.toLowerCase()] = parseFloat(
        ethers.utils.formatUnits(finalOwnerRewards[chainId][vaultOwner])
      );
      bnFormattedFinalOwnerRewards[chainId][vaultOwner.toLowerCase()] = 
        ethers.utils.formatUnits(finalOwnerRewards[chainId][vaultOwner])
      ;
    }
  }

  for (let chainId of Object.keys(formattedFinalOwnerRewards)) {
    const vaultOwners = Object.keys(finalOwnerRewards[chainId])
    const jsonOutput = JSON.stringify({
      details: {
        chainId,
        total: parseFloat(ethers.utils.formatUnits(total)),
        startBlock,
        endBlock,
        includedVaults,
        nVaultsIncluded: includedVaults.length,
      },
      values: formattedFinalOwnerRewards[chainId],
    });

    const JsonFileName = `${chainId}-vault-rewards-${startBlock}-${endBlock}-api.json`;
    const CsvFileName = `${chainId}-vault-rewards-${startBlock}-${endBlock}-gnosis.csv`;

    fs.writeFileSync(JsonFileName, jsonOutput);

    const gnosisOutputLines = [];

    for (let i = 0; i < vaultOwners.length; i++) {
      const vaultOwner = vaultOwners[i];
      gnosisOutputLines.push(
        `erc20,${rewardAddress[chainId]},${vaultOwner},${bnFormattedFinalOwnerRewards[chainId][vaultOwner.toLowerCase()]
        },`
      );
    }

    fs.writeFileSync(CsvFileName, gnosisOutputLines.join("\n"));

  }
  console.log("Done:)");
}

main();
