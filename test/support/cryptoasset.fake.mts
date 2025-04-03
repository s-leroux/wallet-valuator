import { CryptoRegistry } from "../../src/cryptoregistry.mjs";

const InternalRegistry = CryptoRegistry.create();

// prettier-ignore
export const FakeCryptoAsset = {
  binancecoin: InternalRegistry.findCryptoAsset( "binancecoin", "Binance Coin", "BNB", 18 ),
  bitcoin: InternalRegistry.findCryptoAsset("bitcoin", "bitcoin", "BTC", 8),
  dai: InternalRegistry.findCryptoAsset("dai", "Dai Stablecoin", "DAI", 18),
  ethereum: InternalRegistry.findCryptoAsset("ethereum", "ethereum", "ETH", 18),
  solana: InternalRegistry.findCryptoAsset("solana", "Solana", "SOL", 9),
  tether: InternalRegistry.findCryptoAsset("tether", "Tether USD", "USDT", 6),
  "usd-coin": InternalRegistry.findCryptoAsset("usd-coin", "USDC", "USDC", 6),
};
