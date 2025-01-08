import { CryptoAsset } from "../../src/cryptoasset.mjs";

export const FakeCryptoAsset = {
  bitcoin: new CryptoAsset("bitcoin", "BTC", "bitcoin", 8),
  ethereum: new CryptoAsset("ethereum", "ETH", "ethereum", 18),
};
