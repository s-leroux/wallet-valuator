import { BigNumber } from "./bignumber.mjs";
import type { PriceMetadataType } from "./price.mjs";

export const DEFAULT_BASE_CONFIDENCE = 0.9;
export const BTC_PROXY_CONFIDENCE_FACTOR = 0.88;

const MIN_CONFIDENCE = 0;
const MAX_CONFIDENCE = 1;

const PRICE_ORIGIN_CONFIDENCE: Record<string, number> = {
  COINGECKO: 0.99,
  DEFILLAMA: 0.98,
  CURVE: 0.97,
  YAHOO: 0.85,
  OHLC: 0.9,
};

const TIER1_ORIGINS = new Set(["COINGECKO", "DEFILLAMA", "CURVE"]);

function normalizeOrigin(origin?: string) {
  return origin?.toUpperCase();
}

export function baseConfidenceForOrigin(origin?: string): number | undefined {
  const normalized = normalizeOrigin(origin);
  if (!normalized) {
    return undefined;
  }
  return PRICE_ORIGIN_CONFIDENCE[normalized];
}

export function clampConfidence(value: number): number {
  if (Number.isNaN(value)) {
    return MIN_CONFIDENCE;
  }
  if (value < MIN_CONFIDENCE) {
    return MIN_CONFIDENCE;
  }
  if (value > MAX_CONFIDENCE) {
    return MAX_CONFIDENCE;
  }
  return value;
}

export function metadataConfidence(
  metadata: Partial<PriceMetadataType>,
  fallback: number = DEFAULT_BASE_CONFIDENCE
): number {
  if (metadata.confidence !== undefined) {
    return clampConfidence(metadata.confidence);
  }

  const base = baseConfidenceForOrigin(metadata.origin);
  if (base !== undefined) {
    return base;
  }

  return fallback;
}

export function normalizeConfidence(
  value: number | undefined,
  fallback: number
): number {
  if (value === undefined) {
    return clampConfidence(fallback);
  }
  return clampConfidence(value);
}

function originTier(origin?: string): "tier1" | "lower" {
  const normalized = normalizeOrigin(origin);
  if (normalized && TIER1_ORIGINS.has(normalized)) {
    return "tier1";
  }
  return "lower";
}

export function sourceConsistencyFactor(
  originA?: string,
  originB?: string
): number {
  const normalizedA = normalizeOrigin(originA);
  const normalizedB = normalizeOrigin(originB);

  if (!normalizedA || !normalizedB) {
    return 0.9;
  }

  if (normalizedA === normalizedB) {
    return 0.98;
  }

  if (
    originTier(normalizedA) === "tier1" &&
    originTier(normalizedB) === "tier1"
  ) {
    return 0.94;
  }

  return 0.9;
}

export function volatilityFactorFromRates(
  current: BigNumber,
  previous?: BigNumber
): number {
  if (!previous || previous.isZero()) {
    return 0.95;
  }

  const changePercent = current
    .minus(previous)
    .div(previous)
    .mul(100);
  const absChange = Math.abs(changePercent.toNumber());

  if (absChange < 2) {
    return 0.98;
  }
  if (absChange < 5) {
    return 0.95;
  }
  if (absChange < 10) {
    return 0.92;
  }
  return 0.88;
}
