import { BigNumberish, BigNumber } from "ethers";

const { sleep, chunkArray, splitToChunks } = require('./utils');

const Erc20Stablecoin = require("../../../abis/erc20Stablecoin.json");
const QiStablecoin = require("../../../abis/QiStablecoin.json");
const { Contract } = require("ethcall");


const MAI_100 = BigNumber.from(10).pow(18).mul(100);

async function tryGetMulticallResults(
    multicall: any,
    calls: any,
    repeatOnFail: any,
    block: any,
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


function getContracts(vaultAddress: string) {
    const isMaticVault =
        vaultAddress.toLowerCase() == "0xa3fa99a148fa48d14ed51d610c367c61876997f1";


    const vaultContract = new Contract(
        vaultAddress,
        isMaticVault ? QiStablecoin.abi : Erc20Stablecoin
    );

    const nftContract = new Contract(
        isMaticVault ? "0x6AF1d9376a7060488558cfB443939eD67Bb9b48d" : vaultAddress,
        Erc20Stablecoin
    );

    return { nftContract, vaultContract, isMaticVault }
}
async function getVaultResults(multicall: any, vaultAddress: string, blockNumber: BigNumberish, endBlock: BigNumberish) {

    const { vaultContract, nftContract, isMaticVault } = getContracts(vaultAddress);


    // const [price] = await tryGetMulticallResults(
    //     multicall,
    //     [vaultContract.getEthPriceSource()],
    //     true,
    //     blockNumber
    // );

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
                console.log(results);
                done = true;
            } catch (e) {
                console.log("Error", e);
                console.log(vaultCallsChunked[i]);
                sleep(1000);
                console.log("Errored. Retrying.");
            }
        }
    }
    const resultsChunked =  splitToChunks(
        vaultResults,
        existingVaults.length
      );
    
    const finalResults = [];
    for (let i = 0; i < resultsChunked.length; i++) {
        const [owner, collateral, debt, cdr_big] = resultsChunked[i];
        
        if(debt.gte(MAI_100)) {
            finalResults.push(resultsChunked[i]);
        } else {
            console.log("ignored: ", owner, debt.toString(), MAI_100);
        }
  
    }
    return finalResults;
}

module.exports = {
    getVaultResults,
    tryGetMulticallResults,
    getContracts
}