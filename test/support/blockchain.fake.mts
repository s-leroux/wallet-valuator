import type { BlockchainInternalID } from "../../src/blockchain.mjs";

export const FAKE_ETH_CHAIN_ID = "fake-ethereum" as BlockchainInternalID;
export const FAKE_ETH_CHAIN_DATA = {
  type: "evm",
  "display-name": "Fake Ethereum",
  "explorer-name": "MyExplorerId",
  "explorer-options": {
    chainid: 123,
  },
} as const;

export const FAKE_GNO_CHAIN_ID = "fake-gnosis" as BlockchainInternalID;
export const FAKE_GNO_CHAIN_DATA = {
  type: "evm",
  "display-name": "Fake Gnosis",
  "explorer-name": "MyExplorerId",
  "explorer-options": {
    chainid: 999,
  },
} as const;
