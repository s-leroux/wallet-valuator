import { CryptoAsset } from "./cryptoasset.mjs";
import type { FiatCurrency } from "./fiatcurrency.mjs";

import { BigNumber, BigNumberSource } from "./bignumber.mjs";

/**
 * Represents the exchange rate between a crypto-asset and a fiat currency.
 *
 * The Price class encapsulates the conversion rate between a specific crypto-asset
 * and a fiat currency (e.g. USD, EUR). It provides methods for currency conversion
 * and rate multiplication while maintaining the relationship between the assets.
 *
 * @example
 * const ethPrice = new Price(ethereum, usd, 2000); // 1 ETH = 2000 USD
 * const eurPrice = ethPrice.to(eur, 0.85); // Convert to EUR using USD/EUR rate
 *
 * XXX Consider rewriting that as a (CryptoAsset, Value) tupple.
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

  mul(v: BigNumberSource): Price {
    return new Price(this.crypto, this.fiatCurrency, this.rate.mul(v));
  }
}
