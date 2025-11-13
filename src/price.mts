import { CryptoAsset } from "./cryptoasset.mjs";
import type { FiatCurrency } from "./fiatcurrency.mjs";

import { BigNumber, BigNumberSource } from "./bignumber.mjs";
import { GlobalMetadataStore, MetadataFacade } from "./metadata.mjs";
import { ValueError } from "./error.mjs";

type PriceMetadataType = {
  origin: string;
  confidence?: number;
  volatilityChangePercent?: number;
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
 * const ethPrice = new Price(ethereum, usd, 2000); // 1 ETH = 2000 USD
 * const eurPrice = ethPrice.to(eur, 0.85); // Convert to EUR using USD/EUR rate
 *
 * ISSUE #126 Consider rewriting that as a (CryptoAsset, Value) tupple.
 */
export class Price {
  readonly crypto: CryptoAsset;
  readonly fiatCurrency: FiatCurrency;
  readonly rate: BigNumber;
  readonly confidence: number;

  constructor(
    crypto: CryptoAsset,
    fiatCurrency: FiatCurrency,
    rate: BigNumberSource,
    confidence: number = 1
  ) {
    this.crypto = crypto;
    this.fiatCurrency = fiatCurrency;
    this.rate = BigNumber.from(rate);
    if (!Number.isFinite(confidence)) {
      throw new ValueError("Invalid confidence value: must be finite");
    }
    if (confidence < 0 || confidence > 1) {
      throw new ValueError(
        "Invalid confidence value: must be in the [0, 1] range"
      );
    }
    this.confidence = confidence;
  }

  /**
   *  Convert a price to another fiat currency given the exchange rate.
   */
  to(
    destinationCurrency: FiatCurrency,
    exchangeRate: BigNumberSource,
    confidence: number = this.confidence
  ) {
    return new Price(
      this.crypto,
      destinationCurrency,
      this.rate.mul(exchangeRate),
      confidence
    );
  }

  mul(v: BigNumberSource): Price {
    return new Price(
      this.crypto,
      this.fiatCurrency,
      this.rate.mul(v),
      this.confidence
    );
  }

  withConfidence(confidence: number): Price {
    return new Price(this.crypto, this.fiatCurrency, this.rate, confidence);
  }

  toString() {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return `${this.crypto}/${this.fiatCurrency} ${this.rate}`;
  }
}
