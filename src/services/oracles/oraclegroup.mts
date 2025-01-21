import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { FiatConverter } from "../fiatconverter.mjs";
import type { Price } from "../../price.mjs";

import { NotImplementedError } from "../../error.mjs";
import { Oracle } from "../oracle.mjs";

export class OracleGroup extends Oracle {
  readonly backends: Oracle[];

  constructor(backends: Oracle[]) {
    super();
    this.backends = backends.slice();
  }

  async getPrice(
    converter: FiatConverter, // oracles may use that if they do not have the data for a required currency
    crypto: CryptoAsset,
    date: Date,
    fiat: FiatCurrency[]
  ): Promise<Record<FiatCurrency, Price>> {
    const result = {} as Record<FiatCurrency, Price>;
    let missing = fiat;

    // we DO NOT use concurrency here to avoid wasting API calls from our quotas
    for (const backend of this.backends) {
      const intermediateResult = await backend.getPrice(
        converter,
        crypto,
        date,
        missing
      );
      for (const [currency, price] of Object.entries(intermediateResult) as [
        FiatCurrency,
        Price
      ][]) {
        result[currency] = price; // XXX What to do it we already have that price? Should we check consistency?
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
