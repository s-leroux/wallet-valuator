import { StaticCryptoResolver } from "../../src/services/cryptoresolvers/staticcryptoresolver.mjs";

//prettier-ignore
const cryptoTable = [
  ["binance coin", "bnb chain", null, "Binance Coin", "BNB", 18],
  ["bitcoin", "bitcoin", null, "Bitcoin", "BTC", 8],
  ["dai", "ethereum", "0x6B175474E89094C44Da98b954EedeAC495271d0F", "Dai Stablecoin", "DAI", 18],
  ["dai", "gnosis", "0x44FA8E6F47987339850636F88629646662444217", "Dai Stablecoin", "DAI", 18],
  ["dai", "polygon", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", "Dai Stablecoin", "DAI", 18],
  ["ethereum", "ethereum", null, "Ethereum", "ETH", 18],
  ["gnosis" ,"wbtc" ,"Wrapped Bitcoin", "0x8e5bBbb09Ed1ebd8674Cda39A0c169401db4252","WBTC" ,8 ],
  ["polygon" ,"wbtc" ,"0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6","Wrapped Bitcoin","WBTC" ,8 ],
  ["solana", "solana", null, "Solana", "SOL", 9],
  ["usdc", "arbitrum", "0xaf88d065e77c8cc2239327c5edb3a432268e5831", "USD Coin", "USDC", 6],
  ["usdc", "bnb chain", "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", "USD Coin", "USDC", 18],
  ["usdc", "ethereum", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "USD Coin", "USDC", 6],
  ["usdc", "gnosis", "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83", "USD Coin", "USDC", 6],
  ["usdc", "polygon", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", "USD Coin", "USDC", 6],
  ["usdc", "solana", "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", "USD Coin", "USDC", 6],
  ["usdt", "ethereum", "0xdAC17F958D2ee523a2206206994597C13D831ec7", "Tether USD", "USDT", 6],
  ["usdt", "gnosis", "0x4ECaBa5870353805A9F068101A40E0f32ED605C6", "Tether USD", "USDT", 6],
  ["usdt", "polygon", "0xC2132D05D31c914a87C6611C10748aeb04B58E8F", "Tether USD", "USDT", 6],
  ["wbtc", "arbitrum", "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f", "Wrapped Bitcoin", "WBTC", 8],
  ["wbtc", "bnb chain", "0x0555e30da8f98308edb960aa94c0db47230d2b9c", "Wrapped Bitcoin", "WBTC", 8],
  ["wbtc", "ethereum", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", "Wrapped Bitcoin", "WBTC", 8],
  ["wbtc", "gnosis", "0x8e5bbbb09ed1ebde8674cda39a0c169401db4252", "Wrapped Bitcoin", "WBTC", 8],
  ["wbtc", "polygon", "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", "Wrapped Bitcoin", "WBTC", 8],
  ["weth", "ethereum", "0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2", "Wrapped Ether", "WETH", 18],
  ["weth", "gnosis", "0x6a023ccDd60aE47eB5cB7035863e25eDc1ea8287", "Wrapped Ether", "WETH", 18],
  ["weth", "polygon", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", "Wrapped Ether", "WETH", 18],
  ["xdai", "gnosis", null, "xDai", "xDAI", 18],
] as const;

export class FakeCryptoResolver extends StaticCryptoResolver {
  protected constructor() {
    super(cryptoTable);
  }

  static create(): FakeCryptoResolver {
    return new this();
  }
}

export class GnosisCryptoResolver extends StaticCryptoResolver {
  protected constructor() {
    super(cryptoTable.filter((item) => item[1] == "gnosis"));
  }

  static create(): GnosisCryptoResolver {
    return new this();
  }
}

export class EthereumCryptoResolver extends StaticCryptoResolver {
  protected constructor() {
    super(cryptoTable.filter((item) => item[1] == "ethereum"));
  }

  static create(): EthereumCryptoResolver {
    return new this();
  }
}

export class PolygonCryptoResolver extends StaticCryptoResolver {
  protected constructor() {
    super(cryptoTable.filter((item) => item[1] == "polygon"));
  }

  static create(): PolygonCryptoResolver {
    return new this();
  }
}
