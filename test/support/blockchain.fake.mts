import type { BlockchainInternalId } from "../../src/blockchain.mjs";

export const FAKE_ETH_CHAIN_ID = "fake-ethereum" as BlockchainInternalId;
export const FAKE_ETH_CHAIN_DATA = {
  type: "evm",
  "native-coin": "ethereum",
  "display-name": "Fake Ethereum",
  "explorer-name": "MyExplorerId",
  "explorer-options": {
    chainid: 123,
  },
} as const;

export const FAKE_GNO_CHAIN_ID = "fake-gnosis" as BlockchainInternalId;
export const FAKE_GNO_CHAIN_DATA = {
  type: "evm",
  "native-coin": "xdai",
  "display-name": "Fake Gnosis",
  "explorer-name": "MyExplorerId",
  "explorer-options": {
    chainid: 999,
  },
} as const;

export const FAKE_BTC_CHAIN_ID = "fake-bitcoin" as BlockchainInternalId;
export const FAKE_BTC_CHAIN_DATA = {
  type: "bitcoin",
  "display-name": "Fake Bitcoin",
  "native-coin": "bitcoin",
} as const;
