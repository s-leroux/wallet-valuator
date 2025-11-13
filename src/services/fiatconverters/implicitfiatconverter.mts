import { FiatConverter } from "../fiatconverter.mjs";

import { NotImplementedError, ValueError } from "../../error.mjs";
import { Price } from "../../price.mjs";
import { Oracle, PriceMap } from "../oracle.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import { GlobalMetadataStore } from "../../metadata.mjs";
import { logger } from "../../debug.mjs";
import { CryptoMetadata } from "../../cryptoregistry.mjs";

const log = logger("implicit-fiat-converter");

const BTC_PROXY_FACTOR = 0.88;
const SOURCE_CONSISTENCY_FACTORS = {
  same_source: 0.98,
  different_tier1: 0.94,
  mixed_quality: 0.9,
} as const;
const DEFAULT_VOLATILITY_FACTOR = 0.98;
const TIER1_ORIGINS = new Set(["COINGECKO", "DEFILLAMA", "CURVE"]);

type PriceMetadataSnapshot = {
  origin?: string;
  confidence?: number;
  volatilityChangePercent?: number;
};

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function getSourceConsistencyFactor(originA?: string, originB?: string) {
  if (originA && originB && originA === originB) {
    return SOURCE_CONSISTENCY_FACTORS.same_source;
  }

  if (originA && originB) {
    const bothTier1 = TIER1_ORIGINS.has(originA) && TIER1_ORIGINS.has(originB);
    if (bothTier1) {
      return SOURCE_CONSISTENCY_FACTORS.different_tier1;
    }
  }

  return SOURCE_CONSISTENCY_FACTORS.mixed_quality;
}

function getVolatilityFactor(changePercent?: number) {
  if (changePercent === undefined) {
    return DEFAULT_VOLATILITY_FACTOR;
  }
  const absChange = Math.abs(changePercent);
  if (absChange < 2) return 0.98;
  if (absChange < 5) return 0.95;
  if (absChange < 10) return 0.92;
  return 0.88;
}

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

    const toMetadata =
      GlobalMetadataStore.getMetadata<Price, PriceMetadataSnapshot>(toPrice);
    const fromMetadata =
      GlobalMetadataStore.getMetadata<Price, PriceMetadataSnapshot>(fromPrice);

    const baseConfidence = Math.min(
      toPrice.confidence,
      fromPrice.confidence
    );
    const sourceConsistencyFactor = getSourceConsistencyFactor(
      fromMetadata.origin,
      toMetadata.origin
    );
    const volatilityChangePercent =
      toMetadata.volatilityChangePercent ??
      fromMetadata.volatilityChangePercent;
    const volatilityFactor = getVolatilityFactor(volatilityChangePercent);
    const combinedConfidence = clampConfidence(
      baseConfidence *
        BTC_PROXY_FACTOR *
        sourceConsistencyFactor *
        volatilityFactor
    );

    log.trace(
      "C1014",
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `Synthetize ${price.crypto}/${to} from ${this.crypto} at ${date}`
    );
    const exchangeRage = toPrice.rate.div(fromPrice.rate);

    return GlobalMetadataStore.setMetadata(
      price.to(to, exchangeRage, combinedConfidence),
      {
        origin: "CONVERTER",
        confidence: combinedConfidence,
        volatilityChangePercent,
      }
    );
  }
}
