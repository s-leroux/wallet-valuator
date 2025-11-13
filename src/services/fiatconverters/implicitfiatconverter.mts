import { FiatConverter } from "../fiatconverter.mjs";

import { NotImplementedError, ValueError } from "../../error.mjs";
import { Price } from "../../price.mjs";
import { Oracle, PriceMap } from "../oracle.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import { GlobalPriceMetadata } from "../../price.mjs";
import { logger } from "../../debug.mjs";
import { CryptoMetadata } from "../../cryptoregistry.mjs";
import {
  BTC_PROXY_CONFIDENCE_FACTOR,
  DEFAULT_BASE_CONFIDENCE,
  clampConfidence,
  metadataConfidence,
  sourceConsistencyFactor,
  volatilityFactorFromRates,
} from "../../priceconfidence.mjs";

const log = logger("implicit-fiat-converter");

export class ImplicitFiatConverter implements FiatConverter {
  readonly oracle: Oracle;
  readonly crypto: CryptoAsset;

  constructor(
    oracle: Oracle,
    crypto: CryptoAsset | undefined // ISSUE #45 Check that once we have decided about CryptoResolver returning `null` vs throwing an exception
  ) {
    if (!crypto) {
      throw new ValueError(`The reference crypto-asset must be defined`);
    }

    this.oracle = oracle;
    this.crypto = crypto;
  }

  static create(oracle: Oracle, crypto: CryptoAsset) {
    return new ImplicitFiatConverter(oracle, crypto);
  }

  async convert(
    registry: CryptoRegistryNG,
    date: Date,
    price: Price,
    to: FiatCurrency
  ): Promise<Price> {
    const from = price.fiatCurrency;

    // handle the trivial case
    if (from == to) {
      return price;
    }

    const priceMap = new Map() as PriceMap;
    const cryptoMetadata = CryptoMetadata.create();
    cryptoMetadata.setMetadata(this.crypto, {});
    await this.oracle.getPrice(
      registry,
      cryptoMetadata,
      this.crypto,
      date,
      new Set([from, to]),
      priceMap
    ); // ISSUE #64 What to do if this fails?

    const toPrice = priceMap.get(to);
    const fromPrice = priceMap.get(from);

    if (toPrice === undefined || fromPrice === undefined) {
      throw new NotImplementedError(
        "Unable to find the reference prices.\nSee ISSUE #94"
      );
    }

    log.trace(
      "C1014",
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `Synthetize ${price.crypto}/${to} from ${this.crypto} at ${date}`
    );
    const exchangeRage = toPrice.rate.div(fromPrice.rate);

    let previousReference;
    try {
      const previousDate = new Date(date);
      previousDate.setUTCDate(previousDate.getUTCDate() - 1);
      const previousPriceMap = new Map() as PriceMap;
      await this.oracle.getPrice(
        registry,
        cryptoMetadata,
        this.crypto,
        previousDate,
        new Set([from]),
        previousPriceMap
      );
      previousReference = previousPriceMap.get(from);
    } catch (err) {
      log.trace("C1020", "Unable to retrieve previous reference price", err);
    }

    const baseMetadata = GlobalPriceMetadata.getMetadata(price);
    const fromMetadata = GlobalPriceMetadata.getMetadata(fromPrice);
    const toMetadata = GlobalPriceMetadata.getMetadata(toPrice);

    const baseConfidence = metadataConfidence(
      baseMetadata,
      DEFAULT_BASE_CONFIDENCE
    );
    const sourceFactor = sourceConsistencyFactor(
      fromMetadata.origin,
      toMetadata.origin
    );
    const volatilityFactor = volatilityFactorFromRates(
      fromPrice.rate,
      previousReference?.rate
    );

    const convertedConfidence = clampConfidence(
      baseConfidence *
        BTC_PROXY_CONFIDENCE_FACTOR *
        sourceFactor *
        volatilityFactor
    );

    return GlobalPriceMetadata.setMetadata(price.to(to, exchangeRage), {
      origin: "CONVERTER",
      confidence: convertedConfidence,
    });
  }
}
