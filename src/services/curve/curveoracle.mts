import type { CryptoAsset } from "../../cryptoasset.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoRegistryNG } from "../../cryptoregistry.mjs";

import { Oracle } from "../oracle.mjs";
import { CurveAPI, DefaultCurveAPI } from "./curveapi.mjs";
import { CurveMetadata } from "./curvecommon.mjs";
import { GlobalMetadataStore } from "../../metadata.mjs";
import type { PriceMap } from "../oracle.mjs";
import type { CryptoMetadata } from "../../cryptoregistry.mjs";
import { logger } from "../../debug.mjs";
import { Fixed } from "../../bignumber.mjs";

const log = logger("curveoracle");

const USD = FiatCurrency("USD");
const MAX_HISTORICAL_ATTEMPTS = 30; // try up to 30 days in the past to find a price

type CurvePriceLookup = {
  chain: string;
  // XXX Aren't `poolAddress` and `address` mutually exclusive?
  poolAddress?: string;
  address?: string;
};

export class CurveOracle extends Oracle {
  private constructor(readonly api: CurveAPI) {
    super();
  }

  async getPrice(
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    cryptoAsset: CryptoAsset,
    date: Date,
    fiats: Set<FiatCurrency>,
    result: PriceMap,
  ): Promise<void> {
    const metadata = cryptoMetadata.getMetadata<CurveMetadata>(cryptoAsset);

    if (!metadata || metadata.resolver !== "curve") {
      // We do not handle that crypto
      return;
    }

    if (!metadata.chain) {
      log.warn("C2006", "Inconsistent metadata", metadata);
      return;
    }

    if (!metadata.poolAddress && !metadata.address) {
      log.warn("C2007", "Inconsistent metadata", metadata);
      return;
    }

    const pricing_date = new Date(date);
    let priceAsNumber: number | undefined;
    for (let i = 0; i < MAX_HISTORICAL_ATTEMPTS; ++i) {
      try {
        priceAsNumber = await this.getPriceAsUSD(
          cryptoAsset,
          metadata as CurvePriceLookup,
          pricing_date,
        );
        if (priceAsNumber !== undefined) break;
      } catch (err) {
        // ???
        // Error: Error status 500 while fetching https://prices.curve.finance/v1/usd_price/xdai/0xd4b7769dffa274daa8ec351b67609804fafb4307/history?start=1768960735&end=1769047135
        // Internal Server Error
        log.warn("C2104", "Internal server error", err);
      }

      // XXX Should we add a delay here?

      // Try one day earlier
      pricing_date.setDate(pricing_date.getDate() - 1);
    }

    if (priceAsNumber === undefined) return;

    const priceAsFixed = Fixed.fromString(priceAsNumber.toString());
    const price = GlobalMetadataStore.setMetadata(
      cryptoAsset.price(USD, priceAsFixed),
      { origin: "CURVE" },
    );
    result.set(USD, price);
  }

  /**
   * Retrieves a USD price from the Curve prices API for a single calendar day.
   *
   * Low-level helper intended for repeated calls (for example, when searching
   * backward for the most recent quote). Registry-level checks belong in
   * {@link getPrice}; callers must satisfy the prerequisites below.
   *
   * **Prerequisites** (validated once by {@link getPrice}, required of all callers):
   * - `metadata.chain` must be a non-empty blockchain name understood by the Curve API.
   * - At least one of `metadata.poolAddress` or `metadata.address` must be set.
   *
   * **Lookup strategy** (pool path takes precedence when `poolAddress` is set):
   * 1. Pool OHLC — daily USD bars via `getLiquidityPoolOHLC`.
   * 2. Token history — point-in-day USD price via `getUSDPrice`.
   *
   * See https://discord.com/channels/729808684359876718/729812922649542758/1356633193381625961
   *
   * XXX The code works but is awkward. We should probably split this into two functions, one for
   * the "pool path" and one for the "token path". We would have a cleaner interface, better error handling,
   * and the caller `getPrice` would have a more readable logic, especially regarding fallbacks.
   *
   * @returns The USD price, or `undefined` when the API returns no usable data for
   *   the requested day (trace codes C1019, C1020, C1021).
   * @throws {ValueError} When neither `poolAddress` nor `address` is provided (C3118).
   */
  async getPriceAsUSD(
    cryptoAsset: CryptoAsset,
    metadata: CurvePriceLookup,
    date: Date,
  ): Promise<number | undefined> {
    const { chain, poolAddress, address } = metadata;

    // We have two path to find the USD price of a token on Curve.
    // 1. some prices are available by token address using `getUSDPrice`
    // 2. some prices are NOT available from there and requires querying
    // the pool's price.
    while (poolAddress) {
      // Hack above: the `while` is not for looping but to allow `break` to exit this path
      // and fallback to the token path. This is a clue we probably need to split this into two different functions.
      const OHLC = await this.api.getLiquidityPoolOHLC(
        chain,
        poolAddress,
        date,
      );

      // Corner cases:
      // 1. missing or empty data array
      if (!OHLC.data || !OHLC.data.length) {
        log.trace(
          "C1020",
          `No price data available for ${cryptoAsset} at ${date}`,
        );
        break;
      }

      const { open, high, low, close } = OHLC.data[0];

      // 2. no open price
      if (!open) {
        log.trace(
          "C1021",
          `No price data available for ${cryptoAsset} at ${date}`,
        );
        break;
      }

      // "Normal" case
      return high && low && close ? (open + high + low + close) / 4.0 : open;
    }

    if (address) {
      const priceAsUSD = await this.api.getUSDPrice(chain, address, date);
      const priceData = priceAsUSD.data;

      // Validate priceData for corner cases
      if (!priceData || priceData.length === 0) {
        log.trace(
          "C1019",
          `No price data available for ${cryptoAsset} at ${date}`,
        );
        return undefined;
      } else if (priceData.length > 1) {
        log.warn(
          "C2008",
          `Multiple price entries found for ${cryptoAsset} at ${date}, using first entry`,
          priceData,
        );
      }
      return priceAsUSD.data[0].price;
    }

    return undefined;
  }

  static create(api?: CurveAPI) {
    return new CurveOracle(api ?? DefaultCurveAPI.create());
  }
}
export { CurveMetadata };
