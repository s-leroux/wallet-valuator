import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import type { CryptoMetadata } from "../../cryptometadata.mjs";

import { Oracle, type PriceMap } from "../oracle.mjs";
import { logger } from "../../debug.mjs";

const log = logger("composite-oracle");

//========================================================================
//  Composite oracle
//========================================================================

/**
 * An Oracle that retrieves asset prices by sequentially querying multiple backend oracles.
 * It stops as soon as all requested fiat prices are resolved.
 *
 * It is assumed that the backends are ordered by priority, so the first found price is the one returned.
 */
export class CompositeOracle extends Oracle {
  readonly backends: Oracle[];

  //----------------------------------------------------------------------
  //  Oracle creations
  //----------------------------------------------------------------------
  constructor(backends: Oracle[]) {
    super();
    this.backends = backends.slice();
  }

  static create(backends: Oracle[]) {
    return new CompositeOracle(backends);
  }

  //----------------------------------------------------------------------
  //  Price resolution
  //----------------------------------------------------------------------
  async getPrice(
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    crypto: CryptoAsset,
    date: Date,
    currencies: Set<FiatCurrency>,
    result: PriceMap,
  ): Promise<void> {
    log.trace("C1006", `Get price for %s/%s at %s`, crypto, currencies, date);
    const missing = new Set(currencies);

    // we DO NOT use concurrency here to avoid wasting API calls from our quotas
    for (const backend of this.backends) {
      const prices = new Map() as PriceMap;

      await backend.getPrice(
        cryptoRegistry,
        cryptoMetadata,
        crypto,
        date,
        missing,
        prices,
      );

      for (const [currency, price] of prices) {
        // Below: not necessarily very efficient in the general case. But in practice,
        // the oracles tend to reply either with all the requested fiat currencies, or none.
        if (!missing.delete(currency)) {
          // Either the currency was not requested or it was already found
          const existingPrice = result.get(currency);
          if (existingPrice) {
            // Duplicate result: log and ignore
            log.trace(
              "C1025",
              `Price for %s/%s already found (prev:%s vs curr:%s)`,
              crypto,
              currency,
              existingPrice,
              price,
            );
            continue;
          }
        }
        // In all other cases, store the price in the result map
        result.set(currency, price);
      }
      if (!missing.size) {
        break;
      }
    }
  }
}
