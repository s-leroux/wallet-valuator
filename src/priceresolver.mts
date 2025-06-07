import { CryptoAsset } from "./cryptoasset.mjs";
import { CryptoRegistry } from "./cryptoregistry.mjs";
import { logger } from "./debug.mjs";
import { AssertionError } from "./error.mjs";
import { Logged } from "./errorutils.mjs";
import { FiatCurrency } from "./fiatcurrency.mjs";
import { FiatConverter } from "./services/fiatconverter.mjs";
import { Oracle, PriceMap } from "./services/oracle.mjs";
import { Caching } from "./services/oracles/caching.mjs";

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
 *     in other currencies and applying fiat conversion using a FiatConverter.
 *
 * This design ensures that fiat conversion only occurs as a last resort
 * and is never redundantly applied if the correct price is already available.
 */
export class PriceResolver {
  constructor(readonly oracle: Oracle, readonly fiatConverter: FiatConverter) {}

  async getPrice(
    registry: CryptoRegistry,
    crypto: CryptoAsset,
    date: Date,
    fiats: FiatCurrency[] // ISSUE #127 This parameter should be a set. Probably requires NodeJS >= 22
  ): Promise<PriceMap> {
    const prices = new Map() as PriceMap;
    const baseFiat = FiatCurrency("USD"); // The base fiat value used to infer the other. Hard-coded here as the USD.

    if (!fiats.includes(baseFiat)) {
      fiats = [baseFiat, ...fiats];
    }

    // 1. Attempt to retrieve prices using the oracle
    await this.oracle.getPrice(registry, crypto, date, fiats, prices);

    // 2. Check if we have the requested prices
    const found = Array.from(prices.keys());
    const missing = fiats.filter((fiat) => !found.includes(fiat));

    // 3. Invoke the fiat currency converter to infer the missing values
    if (missing.length) {
      log.trace(
        "C1013",
        `Fiat converion required for ${crypto}/${missing} at ${date}`
      );
      // Ensure we have the base price
      const basePrice = prices.get(baseFiat);
      if (!basePrice) {
        throw Logged(
          "C3012",
          AssertionError,
          `Missing base price ${baseFiat} for ${crypto} at ${date}`
        );
      }
      // else
      for (const fiat of missing) {
        prices.set(
          fiat,
          await this.fiatConverter.convert(registry, date, basePrice, fiat)
        );
      }

      // 4. Cache synthetised values
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
