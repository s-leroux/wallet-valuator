import { CryptoAsset } from "./cryptoasset.mjs";

export class Price {
  readonly crypto: CryptoAsset;
  readonly currency: string;
  readonly amount: number;

  constructor(crypto: CryptoAsset, currency: string, amount: number) {
    this.crypto = crypto;
    this.currency = currency;
    this.amount = amount;
  }
}
