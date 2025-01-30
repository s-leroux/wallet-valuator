import type { CryptoAsset } from "../cryptoasset.mjs";
import type { CryptoRegistry } from "../cryptoregistry.mjs";
import type { FiatCurrency } from "../fiatcurrency.mjs";
import type { FiatConverter } from "./fiatconverter.mjs";
import type { Price } from "../price.mjs";

import { Caching } from "./oracles/caching.mjs";

/**
 * Oracle is an abstract class representing a service responsible for retrieving the price of a crypto-asset
 * in one or several fiat currencies. A concrete instance of Oracle may fetch prices from an API or use
 * locally provided CSV data, among other methods. There is no guarantee that an Oracle will be able to
 * return the price for all or any of the requested fiat currencies. An Oracle may also return the price
 * for fiat currencies other than those explicitly requested.
 */
export abstract class Oracle {
  /**
   * Retrieves the price of a given crypto-asset in the specified fiat currencies on a specific date.
   *
   * @param registry - The registry containing information about crypto-assets.
   * @param crypto - The crypto-asset for which the price is being retrieved.
   * @param date - The date for which the price is being retrieved.
   * @param fiat - An array of fiat currencies for which the price is being requested.
   * @returns A promise that resolves to a record mapping each requested fiat currency to its price.
   * If the price for a fiat currency is not available, the corresponding property MUST NOT be set
   * in the result object. The returned record  MAY be a null-prototype object.
   */
  abstract getPrice(
    registry: CryptoRegistry,
    crypto: CryptoAsset,
    date: Date,
    fiat: FiatCurrency[]
  ): Promise<Record<FiatCurrency, Price>>;

  /**
   * Enables caching for the Oracle.
   *
   * @param path - The path where the cache is stored. If undefined, a default path will be used.
   * @returns A new instance of the Oracle with caching enabled.
   */
  cache(path: string | undefined): Oracle {
    return new Caching(this, path);
  }
}
