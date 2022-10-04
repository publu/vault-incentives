require("dotenv").config({ path: require('find-config')('.env') });

const { ChainId } = require("@qidao/sdk");

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'RPC'.
const RPC = {
  [ChainId.ARBITRUM]: process.env.ARBITRUM_RPC_URL,
  [ChainId.MAINNET]: process.env.MAINNET_RPC_URL,
  [ChainId.ROPSTEN]: process.env.ROPSTEN_RPC_URL,
  [ChainId.RINKEBY]: process.env.RINKEBY_RPC_URL,
  [ChainId.GÖRLI]: process.env.GORLI_RPC_URL,
  [ChainId.KOVAN]: process.env.KOVAN_RPC_URL,
  [ChainId.FANTOM]: process.env.FANTOM_RPC_URL,
  [ChainId.FANTOM_TESTNET]: process.env.FANTOM_TESTNET_RPC_URL,
  [ChainId.MATIC]: process.env.MATIC_RPC_URL,
  [ChainId.MATIC_TESTNET]: process.env.MATIC_TESTNET_RPC_URL,
  [ChainId.XDAI]: process.env.XDAI_RPC_URL,
  [ChainId.BSC]: process.env.BSC_RPC_URL,
  [ChainId.BSC_TESTNET]: process.env.BSC_TESTNET_RPC_URL,
  [ChainId.MOONBASE]: process.env.MOONBASE_RPC_URL,
  [ChainId.AVALANCHE]: process.env.AVALANCE_RPC_URL,
  [ChainId.FUJI]: process.env.FUJI_RPC_URL,
  [ChainId.HECO]: process.env.HECO,
  [ChainId.HECO_TESTNET]: process.env.HECO_TESTNET_RPC_URL,
  [ChainId.HARMONY]: process.env.HARMONY_RPC_URL,
  [ChainId.HARMONY_TESTNET]: process.env.HARMONY_TESTNET_RPC_URL,
  [ChainId.OPTIMISM]: process.env.OPTIMISM_RPC_URL,
  [ChainId.METIS]: process.env.METIS_RPC_URL,
};

module.exports = {
  RPC,
};
