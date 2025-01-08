import { CryptoAsset } from "../../src/cryptoasset.mjs";

export const FakeCryptoAsset = {
  bitcoin: new CryptoAsset("bitcoin", "bitcoin", "BTC", 8),
  binancecoin: new CryptoAsset("binancecoin", "Binance Coin", "BNB", 18),
  ethereum: new CryptoAsset("ethereum", "ethereum", "ETH", 18),
  solana: new CryptoAsset("solana", "Solana", "SOL", 9),
};
