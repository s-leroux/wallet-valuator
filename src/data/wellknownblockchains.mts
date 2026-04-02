export const WellKnownBlockchains = {
  "binance-cex": {
    comment: "pseudo entry for the Binance CEX",
    type: "binance",
    "display-name": "Binance",
  },
  arbitrum: {
    type: "evm",
    "display-name": "Arbitrum",
    "native-coin": "ethereum",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 42161,
    },
  },
  base: {
    type: "evm",
    "display-name": "Base",
    "native-coin": "ethereum",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 8453,
    },
  },
  "bnb-chain": {
    type: "evm",
    "display-name": "BNB Chain",
    "native-coin": "binance-coin",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 56,
    },
  },
  bitcoin: {
    type: "bitcoin",
    "display-name": "Bitcoin",
    "native-coin": "bitcoin",
  },
  ethereum: {
    type: "evm",
    "display-name": "Ethereum",
    "native-coin": "ethereum",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 1,
    },
  },
  gnosis: {
    type: "evm",
    "display-name": "Gnosis",
    "native-coin": "xdai",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 100,
    },
  },
  optimism: {
    type: "evm",
    "display-name": "Optimism",
    "native-coin": "ethereum",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 10,
    },
  },
  polygon: {
    type: "evm",
    "display-name": "Polygon",
    "native-coin": "matic",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 137,
    },
  },
  solana: {
    type: "solana",
    "display-name": "Solana",
    "native-coin": "solana",
  },
  xdai: {
    comment: "xdai was the former name of the gnosis chain",
    type: "redirect",
    redirect: "gnosis",
  },
  "xrp-ledger": {
    type: "xrp-ledger",
    "display-name": "XRP Ledger",
    "native-coin": "ripple",
  },
} as const;
