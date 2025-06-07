import { logger } from "./debug.mjs";
import { ValueError } from "./error.mjs";
import { InstanceCache } from "./instancecache.mjs";

const log = logger("fiatcurrency");

/**
 * Fiat currency represented in ISO 4217 trigrams
 */
export type FiatCurrency = string & { readonly brand: unique symbol }; // "EUR", "BTC", "USD" and others

export function FiatCurrency(currency: string) {
  if (currency.length != 3) {
    throw new ValueError(
      `Currency codes should contain exactly 3 letters: "${currency}" is invalid.`
    );
  }
  return currency.toUpperCase() as FiatCurrency;
}

/**
 * Value object representing a fiat currency in ISO 4217 format.
 * Instances are cached and identity-comparable.
 */
interface FiatCurrencyNG {
  /** The ISO 4217 fiat currency code in uppercase (e.g., "USD", "EUR") */
  readonly code: string;
}

/**
 * Standard implementation of the FiatCurrencyNG interface.
 * Instances are created through the FiatCurrencyNG factory function
 * and are cached for identity comparison.
 *
 * @internal
 */
class StandardFiatCurrencyNG {
  constructor(readonly code: string) {}

  /**
   * Returns the currency code in uppercase.
   * @returns The ISO 4217 currency code
   */
  toString(): string {
    return this.code;
  }

  /**
   * Returns the currency code in uppercase.
   * @returns The ISO 4217 currency code
   */
  valueOf(): string {
    return this.code;
  }
}

// Cache for FiatCurrencyNG instances
const currencyCache = new InstanceCache<string, FiatCurrencyNG>();

/**
 * Creates or retrieves a FiatCurrencyNG instance for the given currency code.
 * The currency code is case-insensitive and must be a valid ISO 4217 trigram.
 * Instances are cached and comparable by identity.
 *
 * @param currency - The currency code (e.g., "USD", "eur")
 * @returns A FiatCurrencyNG instance
 * @throws ValueError if the currency code is invalid
 * @example
 * const usd = FiatCurrencyNG("USD");
 * const eur = FiatCurrencyNG("eur"); // Case-insensitive
 * assert(usd === FiatCurrencyNG("USD")); // Identity comparison
 */
export function FiatCurrencyNG(currency: string): FiatCurrencyNG {
  const normalizedCode = currency.toUpperCase();
  return currencyCache.getOrCreate(normalizedCode, () => {
    // Extra validation
    if (currency.length !== 3 || currency !== currency.toUpperCase()) {
      const error = new ValueError(
        `Currency codes should contain exactly 3 upper-case letters: "${currency}" is invalid.`
      );
      log.error("C3015", error);
      throw error;
    }
    return new StandardFiatCurrencyNG(normalizedCode);
  });
}
