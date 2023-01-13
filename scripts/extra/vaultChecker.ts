import axios from 'axios';
import path from 'path';

const hardhat = require('hardhat')

const  {ethers}  = require("ethers");
const { Provider } = require('ethcall');
const fs = require("fs");

const input = require('./input.json');
const abi = require("./abi.json");

let vaults = input.details.includedVaults["10"]

vaults = vaults[Object.keys(vaults)[0]]

const addresses = Object.keys(input.values)

const provider = hardhat.ethers.provider;

const startBlock =  5498667;

const interval = 1000000;

async function sleep(n: number) {
    return  await new Promise(r => setTimeout(r, n));
}

let toBlock: any;

const getCreateEvents = async (vault:string, startBlock: string, prevEvents: any[])  => {
    const contract = new ethers.Contract(vault, abi, provider)
    const filter = contract.filters.CreateVault()

    const response = await axios.get(
        "https://api-optimistic.etherscan.io/api",
        {
            params: {
                "module":"logs",
                "action":"getLogs",
                "fromBlock": startBlock,
                "toBlock": toBlock,
                "address": filter.address,
                "topic0": filter.topics[0],
                "page": 1,
                "offset":"1000",
                "apikey":"CIFYF1DXVPYGHTCQRNIUICHN2ECQVJQ96K"
            }
        }        
    )
    
    const rawEvents = response.data.result;
    if(!rawEvents || rawEvents.length == 0) {
        return prevEvents;
    }

    const events:any[] = prevEvents;
    let lastBlock:any = 0;

    for(let i=0;i<rawEvents.length;i++) {
        const event = contract.interface.parseLog(rawEvents[i]);
        events.push({ vaultID: event.args[0], address: event.args[1]})
        lastBlock =  BigInt(rawEvents[i].blockNumber) > lastBlock ? BigInt(rawEvents[i].blockNumber) : lastBlock;
    }

    if(startBlock == lastBlock) {
        return events;
    }


    await sleep(100);
    return await getCreateEvents(vault, lastBlock.toString(), events);
}


const getBorrowEvents =async (vault:string, startBlock: string, prevEvents: any[]) => {
    const contract = new ethers.Contract(vault, abi, provider)
    const filter = contract.filters.BorrowToken()

    const response = await axios.get(
        "https://api-optimistic.etherscan.io/api",
        {
            params: {
                "module":"logs",
                "action":"getLogs",
                "fromBlock": startBlock,
                "toBlock": toBlock,
                "address": filter.address,
                "topic0": filter.topics[0],
                "page": 1,
                "offset":"1000",
                "apikey":"CIFYF1DXVPYGHTCQRNIUICHN2ECQVJQ96K"
            }
        }        
    )
    
    const rawEvents = response.data.result;

    if(!rawEvents || rawEvents.length == 0) {
        return prevEvents;
    }

    const events:any[] = prevEvents;
    let lastBlock:any = 0;

    for(let i=0;i<rawEvents.length;i++) {
        const event = contract.interface.parseLog(rawEvents[i]);
        events.push({ vaultID: event.args[0]})
        lastBlock =  BigInt(rawEvents[i].blockNumber) > lastBlock ? BigInt(rawEvents[i].blockNumber) : lastBlock;
    }

    if(startBlock == lastBlock) {
        return events;
    }


    await sleep(100);
    return await getBorrowEvents(vault, lastBlock.toString(), events);
}




async function main() {

    // if the created it
    // if they borrowed from it
    toBlock = await provider.getBlockNumber();
    
    const qualifiedAddresses = new Set();

    let vaultEvents: any[] = [];
    for(let vault in vaults) {
        vaultEvents.push({
            vault: vault,
            create: await getCreateEvents(vault, startBlock + "", []),
            borrow: await getBorrowEvents(vault, startBlock + "", [])          
        })
        console.log(vault)
    }
    
    for(let index = 0;index < addresses.length;index++) {

        let address = addresses[index];

        for(let i=0;i<vaultEvents.length;i++) {
            
            let createEvents = vaultEvents[i].create.filter((event:any) => {
                return event.address.toLowerCase() == address.toLowerCase()
            });

            for(let j=0;j<createEvents.length;j++) {
                if(!createEvents[i]) {
                    continue;
                }
                let borrowEvents = vaultEvents[i].borrow.filter((event: any) => {
                    return event.vaultID.toNumber() == createEvents[i].vaultID.toNumber()
                })
                if(borrowEvents.length > 0) {
                    qualifiedAddresses.add(address);
                }
            }
           
        }

    }
    fs.writeFileSync("./output.json", JSON.stringify(Array.from(qualifiedAddresses), null, 4))
    console.log(qualifiedAddresses);
}

(async () => {
    await main();
})();


