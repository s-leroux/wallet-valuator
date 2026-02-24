import { CryptoAsset } from "./cryptoasset.mjs";
import { CryptoMetadata, CryptoRegistryNG } from "./cryptoregistry.mjs";
import { logger } from "./debug.mjs";
import { ProtocolError } from "./error.mjs";
import { FiatCurrency } from "./fiatcurrency.mjs";
import { Price } from "./price.mjs";
import { FiatConverter } from "./services/fiatconverter.mjs";
import { Oracle, type PriceMap } from "./services/oracle.mjs";
import { Caching } from "./services/oracles/caching.mjs";
import { EnsureNG } from "./type.mjs";

const log = logger("price-resolver");

//======================================================================
//  Utilities
//======================================================================

const REFERENCE_FIAT_CURRENCY = FiatCurrency("USD");

type CryptoFiatPair = string & {
  readonly __brand: unique symbol;
};

function toCryptoFiatPair(
  cryptoAsset: CryptoAsset,
  fiatCurrency: FiatCurrency,
): CryptoFiatPair {
  return `${cryptoAsset.id}/${fiatCurrency.code}` as CryptoFiatPair;
}

//======================================================================
//  Utilities
//======================================================================

/**
 * Resolves asset prices across multiple oracles and fiat currencies.
 *
 * Motivation:
 * In the original design, each oracle was responsible for converting prices
 * to the desired fiat currency using a FiatConverter. This proved flawed
 * in composite scenarios where fallback oracles may provide the price
 * in the correct fiat currency directly, making earlier conversions premature
 * and possibly incorrect.
 *
 * Strategy:
 * The `PriceResolver` centralizes the resolution logic by:
 *   - Querying each available oracle in order of priority.
 *   - Attempting to retrieve the desired price in the requested fiat currency.
 *   - If a direct match is not available, falling back to resolving prices
 *     from a well-known price (USD price) using a FiatConverter.
 *   - Finally, if nothing works, we keep the latest known price.
 *
 * This design ensures that fiat conversion only occurs late
 * and is never redundantly applied if the correct price is already available.
 *
 * Notice the PriceResolver is stateful because of the price caching.
 * `PriceResolver.getPrice()` MUST be called in monotonically ascending date order.
 */
export class PriceResolver {
  lastDate: Date = new Date(0);
  referencePrice = new Map<CryptoFiatPair, Price>();

  constructor(
    readonly oracle: Oracle,
    readonly fiatConverter: FiatConverter,
  ) {}

  async getPrice(
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    cryptoAsset: CryptoAsset,
    date: Date,
    fiats: Set<FiatCurrency>,
  ): Promise<PriceMap> {
    //
    // 0. Sanity check:
    EnsureNG.isTrue(
      "C3101",
      date >= this.lastDate,
      ProtocolError,
      "Non-monotonically increasing dates",
    );
    this.lastDate = date;

    //
    // Real job starts now
    const prices = new Map() as PriceMap;

    fiats = new Set(fiats);
    fiats.add(REFERENCE_FIAT_CURRENCY);

    // 1. Attempt to retrieve prices using the oracle
    await this.oracle.getPrice(
      cryptoRegistry,
      cryptoMetadata,
      cryptoAsset,
      date,
      fiats,
      prices,
    );

    // 2. Cache the 1st class prices in the internal cache
    prices.forEach((price) => {
      this.referencePrice.set(
        toCryptoFiatPair(price.crypto, price.fiatCurrency),
        price,
      );
    });

    // 3. Check if we have all the requested prices
    const found = new Set(prices.keys());
    const missing = fiats.difference(found);
    // XXX If there is only 1 missing price, we should check if this is REFERENCE_FIAT_CURRENCY
    // I don't know if we should throw or ignore such a case.

    // 4. Invoke the fiat currency converter to infer the missing values
    if (missing.size) {
      log.trace(
        "C1013",
        `Fiat conversion required for ${cryptoAsset} at ${date}`,
        missing,
      );

      const basePrice =
        prices.get(REFERENCE_FIAT_CURRENCY) ??
        this.referencePrice.get(
          toCryptoFiatPair(cryptoAsset, REFERENCE_FIAT_CURRENCY),
        );

      // 4.1 Fail if the reference price is missing
      EnsureNG.isDefined(
        "C1024",
        basePrice,
        `Can't use the FiatConverter for ${cryptoAsset} at ${date}`,
      );

      // 4.2 We have a reference price, so we can use the FiatConverter
      for (const fiat of missing) {
        prices.set(
          fiat,
          await this.fiatConverter.convert(
            cryptoRegistry,
            date,
            basePrice,
            fiat,
          ),
        );
      }

      // 4.3 Cache the synthesized values
      // ISSUE #128 Hack! Hack! Hack!
      if ("insertPrice" in this.oracle) {
        const dateYyyyMmDd = date.toISOString().substring(0, 10);
        const cache = this.oracle as Caching;

        cache.insertPrice(dateYyyyMmDd, prices);
      }
    }

    return prices;
  }
}
