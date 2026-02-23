import { CryptoAsset } from "./cryptoasset.mjs";
import { CryptoMetadata, CryptoRegistryNG } from "./cryptoregistry.mjs";
import { logger } from "./debug.mjs";
import { ProtocolError } from "./error.mjs";
import { FiatCurrency } from "./fiatcurrency.mjs";
import { FiatConverter } from "./services/fiatconverter.mjs";
import { Oracle, type PriceMap } from "./services/oracle.mjs";
import { Caching } from "./services/oracles/caching.mjs";
import { EnsureNG } from "./type.mjs";

const log = logger("price-resolver");

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
  cache: PriceMap = new Map();

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
    const baseFiat = FiatCurrency("USD"); // The base fiat value used to infer the other. Hard-coded here as the USD.

    fiats = new Set(fiats);
    fiats.add(baseFiat);

    // 1. Attempt to retrieve prices using the oracle
    await this.oracle.getPrice(
      cryptoRegistry,
      cryptoMetadata,
      cryptoAsset,
      date,
      fiats,
      prices,
    );

    // 2. Check if we have the requested prices
    const found = new Set(prices.keys());
    const missing = fiats.difference(found);

    // 3. Invoke the fiat currency converter to infer the missing values
    if (missing.size) {
      log.trace(
        "C1013",
        `Fiat conversion required for ${cryptoAsset} at ${date}`,
        missing,
      );
      const basePrice = prices.get(baseFiat) ?? this.cache.get(baseFiat);
      if (basePrice) {
        // 3.1 If we have the base price, we can use the FiatConverter
        for (const fiat of missing) {
          try {
            prices.set(
              fiat,
              await this.fiatConverter.convert(
                cryptoRegistry,
                date,
                basePrice,
                fiat,
              ),
            );
          } catch (err: unknown) {
            log.trace(
              "C1022",
              `Can't price ${cryptoAsset}/${fiat.code} at ${date}. Using cached value instead`,
            );
            const cachedPrice = this.cache.get(fiat);
            EnsureNG.isDefined(
              "C1023",
              cachedPrice,
              `No cached price for ${cryptoAsset}/${fiat.code}`,
            );
            prices.set(fiat, cachedPrice);
          }
        }
      } else {
        // 3.2 Use the cached price if any
        log.trace(
          "C1024",
          `Can't use the FiatConverter for ${cryptoAsset} at ${date}`,
        );
        for (const fiat of missing) {
          const cachedPrice = this.cache.get(fiat);
          EnsureNG.isDefined(
            "C1023",
            cachedPrice,
            `No cached price for ${cryptoAsset}/${fiat.code}`,
          );
          prices.set(fiat, cachedPrice);
        }
      }

      // 4. Cache synthesized values
      // ISSUE #128 Hack! Hack! Hack!
      if ("insertPrice" in this.oracle) {
        const dateYyyyMmDd = date.toISOString().substring(0, 10);
        const cache = this.oracle as Caching;

        cache.insertPrice(dateYyyyMmDd, prices);
      }
    }

    // 5. Update internal cache for next turn
    prices.forEach((value, key) => {
      this.cache.set(key, value);
    });

    return prices;
  }
}
