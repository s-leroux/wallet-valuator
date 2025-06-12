import { CryptoRegistryNG } from "../../src/cryptoregistry.mjs";

const InternalRegistry = CryptoRegistryNG.create();
console.log("cryptoasset.fake.mts");
console.dir(InternalRegistry);
// prettier-ignore
export const FakeCryptoAsset = {
  binancecoin: InternalRegistry.createCryptoAsset( "binancecoin", "Binance Coin", "BNB", 18 ),
  bitcoin: InternalRegistry.createCryptoAsset("bitcoin", "bitcoin", "BTC", 8),
  dai: InternalRegistry.createCryptoAsset("dai", "Dai Stablecoin", "DAI", 18),
  ethereum: InternalRegistry.createCryptoAsset("ethereum", "ethereum", "ETH", 18),
  solana: InternalRegistry.createCryptoAsset("solana", "Solana", "SOL", 9),
  tether: InternalRegistry.createCryptoAsset("tether", "Tether USD", "USDT", 6),
  "usd-coin": InternalRegistry.createCryptoAsset("usd-coin", "USDC", "USDC", 6),
};
