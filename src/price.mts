import { CryptoAsset } from "./cryptoasset.mjs";
import type { FiatCurrency } from "./fiatcurrency.mjs";

import { Fixed, fixedFromSource, FixedSource } from "./bignumber.mjs";
import { GlobalMetadataStore, MetadataFacade } from "./metadata.mjs";

type PriceMetadataType = {
  origin: string;
};

export class PriceMetadata extends MetadataFacade<Price, PriceMetadataType> {}
export const GlobalPriceMetadata = new PriceMetadata(GlobalMetadataStore);

/**
 * Represents the exchange rate between a crypto-asset and a fiat currency.
 *
 * The Price class encapsulates the conversion rate between a specific crypto-asset
 * and a fiat currency (e.g. USD, EUR). It provides methods for currency conversion
 * and rate multiplication while maintaining the relationship between the assets.
 *
 * @example
 * const ethPrice = new Price(ethereum, usd, "2000"); // 1 ETH = 2000 USD
 * const eurPrice = ethPrice.to(eur, "0.85"); // Convert to EUR using USD/EUR rate
 *
 * ISSUE #126 Consider rewriting that as a (CryptoAsset, Value) tupple.
 */
export class Price {
  readonly crypto: CryptoAsset;
  readonly fiatCurrency: FiatCurrency;
  // `rate` means: fiat per 1 crypto display unit.
  readonly rate: Fixed;

  private static rateFromSource(rate: FixedSource): Fixed {
    return fixedFromSource(rate);
  }

  constructor(
    crypto: CryptoAsset,
    fiatCurrency: FiatCurrency,
    rate: FixedSource,
  ) {
    this.crypto = crypto;
    this.fiatCurrency = fiatCurrency;
    this.rate = Price.rateFromSource(rate);
  }

  /**
   * Convert an exchange rate to a different fiat currency.
   *
   * @param destinationCurrency - The destination fiat currency.
   * @param exchangeRate - The fiat exchange rate to apply to the current
   *   `rate`, expressed as: `destinationCurrency per this.fiatCurrency`.
   *
   * Fixed-point migration intent:
   * - When `rate` becomes `Fixed`, the multiplication must be followed by
   *   an explicit rescale back to the receiver's scale.
   */
  to(
    destinationCurrency: FiatCurrency,
    exchangeRate: FixedSource, // destination per source fiat
  ) {
    return new Price(
      this.crypto,
      destinationCurrency,
      // Multiply in fixed-point domain and rescale back to the receiver's
      // canonical `Price.rate` scale.
      this.rate.mul(Price.rateFromSource(exchangeRate), this.rate.scale),
    );
  }

  /**
   * Multiply the price rate by a scalar factor.
   *
   * @param factor - Scalar multiplier applied to the rate.
   *
   * Fixed-point migration intent:
   * - When `rate` becomes `Fixed`, the multiplication must be followed by an
   *   explicit rescale back to the canonical `Price.rate` scale.
   */
  mul(factor: FixedSource): Price {
    return new Price(
      this.crypto,
      this.fiatCurrency,
      // Multiply in fixed-point domain and rescale back to the receiver's
      // canonical `Price.rate` scale.
      this.rate.mul(Price.rateFromSource(factor), this.rate.scale),
    );
  }

  toString() {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return `${this.crypto}/${this.fiatCurrency} ${this.rate}`;
  }
}
