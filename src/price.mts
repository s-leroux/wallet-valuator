import { CryptoAsset } from "./cryptoasset.mjs";
import type { FiatCurrency } from "./fiatcurrency.mjs";

import { BigNumber, BigNumberSource } from "./bignumber.mjs";

/**
 *  A Price instance represents the value of a crypto-asset expressed in a given fiat currency.
 */
export class Price {
  readonly crypto: CryptoAsset;
  readonly fiatCurrency: FiatCurrency;
  readonly rate: BigNumber;

  constructor(
    crypto: CryptoAsset,
    fiatCurrency: FiatCurrency,
    rate: BigNumberSource
  ) {
    this.crypto = crypto;
    this.fiatCurrency = fiatCurrency;
    this.rate = BigNumber.from(rate);
  }

  /**
   *  Convert a price to another fiat currency given the exchange rate.
   */
  to(destinationCurrency: FiatCurrency, exchangeRate: BigNumberSource) {
    return new Price(
      this.crypto,
      destinationCurrency,
      this.rate.mul(exchangeRate)
    );
  }
}
