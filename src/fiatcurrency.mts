import { ValueError } from "./error.mjs";

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
