import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import type { CryptoMetadata } from "../../cryptometadata.mjs";

import { Oracle, PriceMap } from "../oracle.mjs";
import { FiatConverter } from "../fiatconverter.mjs";
import { logger } from "../../debug.mjs";
const log = logger("composite-oracle");

//========================================================================
//  Composite oracle
//========================================================================

/**
 * An Oracle that retrieves asset prices by sequentially querying multiple backend oracles.
 * It stops as soon as all requested fiat prices are resolved.
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
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    log.trace("C1006", `Get price for ${crypto}/${currencies} at ${date}`);
    const missing = new Set(currencies);

    // we DO NOT use concurrency here to avoid wasting API calls from our quotas
    for (const backend of this.backends) {
      await backend.getPrice(
        cryptoRegistry,
        cryptoMetadata,
        crypto,
        date,
        missing,
        result,
      );
      for (const currency of result.keys()) {
        // result.set(currency, price); // Fixed in #157 // ISSUE #61 What to do it we already have that price? Should we check consistency?
        missing.delete(currency);
        // Above: not necessarily very efficient in the general case. But im practice,
        // the oracles tend to reply prices either with all asked fiat currencies, or none.
      }
      if (!missing.size) {
        break;
      }
    }
  }
}
