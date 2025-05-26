import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";
import type { Price } from "../../price.mjs";

import { Oracle } from "../oracle.mjs";
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
    registry: CryptoRegistry,
    crypto: CryptoAsset,
    date: Date,
    fiat: FiatCurrency[],
    fiatConverter: FiatConverter
  ): Promise<Partial<Record<FiatCurrency, Price>>> {
    log.trace("C1006", `Get price for ${crypto}/${fiat} at ${date}`);
    const result = Object.create(null) as Record<FiatCurrency, Price>;
    let missing = fiat;

    // we DO NOT use concurrency here to avoid wasting API calls from our quotas
    for (const backend of this.backends) {
      const intermediateResult = await backend.getPrice(
        registry,
        crypto,
        date,
        missing,
        fiatConverter
      );
      for (const [currency, price] of Object.entries(intermediateResult) as [
        FiatCurrency,
        Price
      ][]) {
        result[currency] = price; // ISSUE #61 What to do it we already have that price? Should we check consistency?
        missing = missing.filter((item) => item !== currency);
        // Above: not necessarily very efficient in the general case. But im practice,
        // the oracles tend to reply prices either with all asked fiat currencies, or none.
      }
      if (!missing.length) {
        break;
      }
    }
    return result;
  }
}
