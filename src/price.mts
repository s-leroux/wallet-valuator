import { CryptoAsset } from "./cryptoasset.mjs";

export class Price {
  readonly crypto: CryptoAsset;
  readonly currency: string; // XXX Should be FiatCurrency ?
  readonly amount: number;

  constructor(crypto: CryptoAsset, currency: string, amount: number) {
    this.crypto = crypto;
    this.currency = currency;
    this.amount = amount;
  }
}
