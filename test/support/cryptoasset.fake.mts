import { CryptoAsset } from "../../src/cryptoasset.mjs";

export const FakeCryptoAsset = {
  binancecoin: CryptoAsset.create("binancecoin", "Binance Coin", "BNB", 18),
  bitcoin: CryptoAsset.create("bitcoin", "bitcoin", "BTC", 8),
  dai: CryptoAsset.create("dai", "Dai Stablecoin", "DAI", 18),
  ethereum: CryptoAsset.create("ethereum", "ethereum", "ETH", 18),
  solana: CryptoAsset.create("solana", "Solana", "SOL", 9),
  tether: CryptoAsset.create("tether", "Tether USD", "USDT", 6),
  "usd-coin": CryptoAsset.create("usd-coin", "USDC", "USDC", 6),
};
