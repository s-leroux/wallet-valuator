import { CryptoAsset } from "./cryptoasset.mjs";
import type { FiatCurrency } from "./fiatcurrency.mjs";

/**
 *  A Price insstance represents the value of a crypto-asset expressed in a given fiat currency.
 */
export class Price {
  readonly crypto: CryptoAsset;
  readonly fiatCurrency: FiatCurrency;
  readonly rate: number; // XXX ISSUE #39 Should we use BigNumber here?

  constructor(
    crypto: CryptoAsset,
    fiatCurrency: FiatCurrency,
    rate: number | string
  ) {
    this.crypto = crypto;
    this.fiatCurrency = fiatCurrency;
    this.rate = +rate;
  }
}
