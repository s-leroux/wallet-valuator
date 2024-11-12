export interface Coin {
  ticker: string;
  name: string;
  oracle_id: string;
  platforms: object;
}

export function get_coin_by_oracle_id(oracle_id: string): Coin {
  for (const coin of coins) {
    if (coin.oracle_id == oracle_id) {
      return coin;
    }
  }
  return null;
}

export function as_coin(thing): Coin {
  if (typeof thing === "string") {
    return get_coin_by_oracle_id(thing);
  }

  return thing;
}

export const coins: Coin[] = [
  {
    ticker: "BTC",
    name: "Bitcoin",
    oracle_id: "bitcoin",
    platforms: {},
  },
  {
    ticker: "XDAI",
    name: "XDAI",
    oracle_id: "xdai",
    platforms: {
      gnosis: "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d",
    },
  },
  {
    ticker: "REG",
    name: "RealToken Ecosystem Governance ",
    oracle_id: "realtoken-ecosystem-governance",
    platforms: {
      gnosis: "0x0aa1e96d2a46ec6beb2923de1e61addf5f5f1dce",
    },
  },
  {
    ticker: "USDC",
    name: "USDC",
    oracle_id: "usd-coin",
    platforms: {
      ethereum: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      polkadot: "1337",
      zksync: "0x1d17cbcf0d6d143135ae902365d2e5e2a16538d4",
      "optimistic-ethereum": "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
      tron: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
      stellar: "USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      "near-protocol":
        "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
      "hedera-hashgraph": "0.0.456858",
      avalanche: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
      base: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      "arbitrum-one": "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      "polygon-pos": "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
      sui: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
      algorand: "31566704",
      solana: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      celo: "0xceba9300f2b948710d2653dd7b07f33a8b32118c",
    },
  },
  {
    ticker: "USDC",
    name: "USDC",
    oracle_id: "gnosis-xdai-bridged-usdc-gnosis",
    platforms: {
      gnosis: "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
    },
  },
];

export const currencies: string[] = ["btc", "eur", "usd"];
