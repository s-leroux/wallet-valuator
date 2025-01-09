import { CryptoAsset } from "../../src/cryptoasset.mjs";

export const FakeCryptoAsset = {
  binancecoin: new CryptoAsset("binancecoin", "Binance Coin", "BNB", 18),
  bitcoin: new CryptoAsset("bitcoin", "bitcoin", "BTC", 8),
  dai: new CryptoAsset("dai", "Dai Stablecoin", "DAI", 18),
  ethereum: new CryptoAsset("ethereum", "ethereum", "ETH", 18),
  solana: new CryptoAsset("solana", "Solana", "SOL", 9),
  tether: new CryptoAsset("tether", "Tether USD", "USDT", 6),
};
