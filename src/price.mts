import { CryptoAsset } from "./cryptoasset.mjs";
import { FiatCurrency } from "./fiatcurrency.mjs";

/**
 *  A Price insstance represents the value of a crypto-asset expressed in a given fiat currency.
 */
export class Price {
  readonly crypto: CryptoAsset;
  readonly fiatCurrency: FiatCurrency;
  readonly rate: number;

  constructor(crypto: CryptoAsset, fiatCurrency: FiatCurrency, rate: number) {
    this.crypto = crypto;
    this.fiatCurrency = fiatCurrency;
    this.rate = rate;
  }
}
