import { StaticCryptoResolver } from "./staticcryptoresolver.mjs";

//prettier-ignore
const defaultCryptoTable = [
  ["armm-v3-usdc", "gnosis", "0xeD56F76E9cBC6A64b821e9c016eAFbd3db5436D1"],
  ["armm-v3-wxdai", "gnosis", "0x0cA4f5554Dd9Da6217d62D8df2816c82bba4157b"],
  ["binance-coin", "bnb chain", null],
  ["bitcoin", "bitcoin", null],
  ["crv", "ethereum", "0xd533a949740bb3306d119cc777fa900ba034cd52"],
  ["crv", "polygon", "0x172370d5cd63279efa6d502dab29171933a610af"],
  ["crvusd", "ethereum", "0xf939e0a03fb07f59a73314e73794be0e57ac1b4e"],
  ["crvusd", "gnosis", "0xabef652195f98a91e490f047a5006b71c85f058d"],
  ["crvusd", "polygon", "0xc4ce1d6f5d98d65ee25cf85e9f2e9dcfee6cb5d6"],
  ["dai", "ethereum", "0x6B175474E89094C44Da98b954EedeAC495271d0F", 0, Infinity],
  ["dai", "gnosis", "0x44FA8E6F47987339850636F88629646662444217"],
  ["dai", "polygon", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"],
  ["ethereum", "ethereum", null],
  ["matic", "polygon", null],
  ["monerium-eure", "ethereum", "0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f", 0, 21419972],
  ["monerium-eure", "ethereum", "0x39b8B6385416f4cA36a20319F70D28621895279D", 21419972, Infinity],
  ["monerium-eure", "gnosis", "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", 35656951, Infinity],
  ["monerium-eure", "gnosis", "0xcB444e90D8198415266c6a2724b7900fb12FC56E", 0, 35656951],
  ["monerium-eure", "polygon", "0x18ec0A6E18E5bc3784fDd3a3634b31245ab704F6", 0, 60733237],
  ["monerium-eure", "polygon", "0xE0aEa583266584DafBB3f9C3211d5588c73fEa8d", 60733237, Infinity],
  ["pol", "polygon", null],
  ["reg", "ethereum", "0x0aa1e96d2a46ec6beb2923de1e61addf5f5f1dce"],
  ["reg", "gnosis", "0x0aa1e96d2a46ec6beb2923de1e61addf5f5f1dce"],
  ["reg", "polygon", "0x0aa1e96d2a46ec6beb2923de1e61addf5f5f1dce"],
  ["ripple", "xrp-ledger", null],
  ["solana", "solana", null],
  ["usdc", "arbitrum", "0xaf88d065e77c8cc2239327c5edb3a432268e5831"],
  ["usdc", "bnb chain", "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"],
  ["usdc", "ethereum", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
  ["usdc", "gnosis", "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83"],
  ["usdc", "polygon", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"],
  ["usdc", "solana", "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"],
  ["usdt", "ethereum", "0xdAC17F958D2ee523a2206206994597C13D831ec7"],
  ["usdt", "gnosis", "0x4ECaBa5870353805A9F068101A40E0f32ED605C6"],
  ["usdt", "polygon", "0xC2132D05D31c914a87C6611C10748aeb04B58E8F"],
  ["wbeth", "bnb chain", "0xa2e3356610840701bdf5611a53974510ae27e2e1"],
  ["wbeth", "ethereum", "0xa2e3356610840701bdf5611a53974510ae27e2e1"],
  ["wbtc" , "polygon" ,"0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6"],
  ["wbtc" ,"gnosis", "0x8e5bBbb09Ed1ebd8674Cda39A0c169401db4252"],
  ["wbtc", "arbitrum", "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f"],
  ["wbtc", "bnb chain", "0x0555e30da8f98308edb960aa94c0db47230d2b9c"],
  ["wbtc", "ethereum", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"],
  ["wbtc", "gnosis", "0x8e5bbbb09ed1ebde8674cda39a0c169401db4252"],
  ["wbtc", "polygon", "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6"],
  ["weth", "ethereum", "0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2"],
  ["weth", "gnosis", "0x6a023ccDd60aE47eB5cB7035863e25eDc1ea8287"],
  ["weth", "polygon", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"],
  ["wsteth", "ethereum", "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0"],
  ["wsteth", "gnosis", "0x6c76971f98945ae98dd7d4dfca8711ebea946ea6"],
  ["xdai", "gnosis", "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d"],
  ["xdai", "gnosis", null],
] as const;

//prettier-ignore
const defaultKeyDomainsMap = [
  ["armm-v3-usdc", "RealT RMM V3 USDC", "armmv3USDC", 18, { STANDARD: { coingeckoId: "usd-coin" } }],
  ["armm-v3-wxdai", "RealT RMM V3 WXDAI", "armmv3WXDAI", 18, { STANDARD: { coingeckoId: "xdai" } }],
  ["binance-coin", "Binance Coin", "BNB", 18, { STANDARD: { coingeckoId: "binancecoin" } }],
  ["bitcoin", "Bitcoin", "BTC", 8, { STANDARD: { coingeckoId: "bitcoin" } }],
  ["crv", "Curve DAO", "CRV", 18 , { STANDARD: { coingeckoId: "curve-dao-token" } }],
  ["crvusd", "crvUSD", "CRVUSD", 18 , { STANDARD: { coingeckoId: "crvusd" } }],
  ["dai", "Dai Stablecoin", "DAI", 18, { STANDARD: { coingeckoId: "dai" } }],
  ["ethereum", "Ethereum", "ETH", 18, { STANDARD: { coingeckoId: "ethereum" } }],
  ["matic", "MATIC", "MATIC", 18 , { STANDARD: { coingeckoId: "matic-network" } }],
  ["monerium-eure","Monerium EURe", "EURe", 18, { STANDARD: { coingeckoId: "monerium-eur-money" } }],
  ["pol", "POL (ex-MATIC)", "POL", 18 , { STANDARD: { coingeckoId: "polygon-ecosystem-token" } }],
  ["reg", "RealToken Ecosystem Governance", "REG", 18, { STANDARD: { coingeckoId: "realtoken-ecosystem-governance" } }],
  ["ripple", "XRP", "XRP", 6 , { STANDARD: { coingeckoId: "ripple" } }],
  ["solana", "Solana", "SOL", 9, { STANDARD: { coingeckoId: "solana" } }],
  ["usdc", "USD Coin", "USDC", 6, { STANDARD: { coingeckoId: "usd-coin" } }],
  ["usdt", "Tether USD", "USDT", 6, { STANDARD: { coingeckoId: "tether" } }],
  ["wbeth", "Wrapped Beacon ETH", "WBETH", 18 , { STANDARD: { coingeckoId: "wrapped-beacon-eth" } }],
  ["wbtc","Wrapped Bitcoin","WBTC" ,8 , { STANDARD: { coingeckoId: "wrapped-bitcoin" } }],
  ["weth", "Wrapped Ether", "WETH", 18, { STANDARD: { coingeckoId: "weth" } }],
  ["wsteth", "Wrapped stETH", "WSTETH", 18 , { STANDARD: { coingeckoId: "wrapped-steth" } }],
  ["xdai", "xDai", "xDAI", 18 , { STANDARD: { coingeckoId: "xdai" } }],
] as const;

/**
 * The default crypto-resolver, rewritten as a sub-class of StaticCryptoResolver.
 */
export class DefaultCryptoResolver extends StaticCryptoResolver {
  protected constructor() {
    super(defaultCryptoTable, defaultKeyDomainsMap);
  }

  static create() {
    return new this();
  }
}
