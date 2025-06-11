import type { CryptoAsset } from "../cryptoasset.mjs";
import type { CryptoRegistryNG } from "../cryptoregistry.mjs";
import type { FiatCurrency } from "../fiatcurrency.mjs";
import type { Price } from "../price.mjs";
import type { CryptoMetadata } from "../cryptometadata.mts";

import { Caching } from "./oracles/caching.mjs";

export type PriceMap = Map<FiatCurrency, Price>;

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
   * @param cryptoMetadata - The metadata about the crypto-asset.
   * @param crypto - The crypto-asset for which the price is being retrieved.
   * @param date - The date for which the price is being retrieved.
   * @param fiat - An array of fiat currencies for which the price is being requested.
   * @param priceMap - The map to store the retrieved prices. This is an output parameter.
   * @returns A promise that resolves when the prices have been added to the map.
   * If the price for a fiat currency is not available, it MUST NOT be added to the map.
   */
  abstract getPrice(
    registry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    crypto: CryptoAsset,
    date: Date,
    fiat: Set<FiatCurrency>,
    priceMap: PriceMap
  ): Promise<void>;

  /**
   * Enables caching for the Oracle.
   *
   * @param path - The path where the cache is stored. If undefined, a default path will be used.
   * @returns A new instance of the Oracle with caching enabled.
   */
  cache(path?: string): Oracle {
    return new Caching(this, path);
  }
}
