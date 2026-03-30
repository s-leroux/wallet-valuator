export const WellKnownBlockchains = {
  "binance-cex": {
    comment: "pseudo entry for the Binance CEX",
    type: "binance",
    "display-name": "Binance",
  },
  arbitrum: {
    type: "evm",
    "display-name": "Arbitrum",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 42161,
    },
  },
  base: {
    type: "evm",
    "display-name": "Base",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 8453,
    },
  },
  "bnb-chain": {
    type: "evm",
    "display-name": "BNB Chain",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 56,
    },
  },
  bitcoin: {
    type: "bitcoin",
    "display-name": "Bitcoin",
  },
  ethereum: {
    type: "evm",
    "display-name": "Ethereum",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 1,
    },
  },
  gnosis: {
    type: "evm",
    "display-name": "Gnosis",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 100,
    },
  },
  optimism: {
    type: "evm",
    "display-name": "Optimism",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 10,
    },
  },
  polygon: {
    type: "evm",
    "display-name": "Polygon",
    "explorer-name": "Etherscan",
    "explorer-options": {
      chainid: 137,
    },
  },
  solana: {
    type: "solana",
    "display-name": "Solana",
  },
  xdai: {
    comment: "xdai was the former name of the gnosis chain",
    type: "redirect",
    redirect: "gnosis",
  },
  "xrp-ledger": {
    type: "xrp-ledger",
    "display-name": "XRP Ledger",
  },
} as const;
