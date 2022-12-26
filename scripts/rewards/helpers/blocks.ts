import { BigNumber } from "ethers";

const { request, gql } = require("graphql-request");


interface BlockNumbers {
    [chainId: string]: number[];
}

interface BlockIntervals {
    [chainID: string]: number;
}



function getBlocksAndIntervals(startBlocks: any[], endBlocks: any[]) {
    var blocks: BlockNumbers = {};
    let blockIntervals: BlockIntervals = {};

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

    return { blocks, blockIntervals };
}

async function getBlocks(date: string) {
    const query =
        gql`
  {
    blocks (where: { ts: ` +
        date +
        `, network_in: ["1", "100", "10", "56", "137", "250", "1088", "42161", "43114"] }) {
      network
      number
    }
  }
  `;
    return (
        await request("https://blockfinder.snapshot.org/graphql", query)
    ).blocks;

}




module.exports = {
    getBlocksAndIntervals,
    getBlocks
}