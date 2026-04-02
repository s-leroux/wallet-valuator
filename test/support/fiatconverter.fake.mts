import { FiatConverter } from "../../src/services/fiatconverter.mjs";

import {
  Fixed,
  fixedFromSource,
  type FixedSource,
} from "../../src/bignumber.mjs";
import { InconsistentUnitsError } from "../../src/error.mjs";
import type { Price } from "../../src/price.mjs";
import type { FiatCurrency } from "../../src/fiatcurrency.mjs";
import type { CryptoRegistryNG } from "../../src/cryptoregistry.mjs";

/**
 * A fake fiat converter that always applies the same fixed-point exchange rate.
 */
export class FixedFiatConverter extends FiatConverter {
  constructor(
    readonly from: FiatCurrency,
    readonly to: FiatCurrency,
    readonly exchangeRate: Fixed,
  ) {
    super();
  }

  static create(
    from: FiatCurrency,
    to: FiatCurrency,
    exchangeRate: FixedSource,
  ): FiatConverter {
    return new FixedFiatConverter(from, to, fixedFromSource(exchangeRate));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async convert(
    registry: CryptoRegistryNG,
    date: Date,
    price: Price,
    to: FiatCurrency,
  ): Promise<Price> {
    if (price.fiatCurrency !== this.from) {
      throw new InconsistentUnitsError(price.fiatCurrency, this.from);
    }
    if (to !== this.to) {
      throw new InconsistentUnitsError(to, this.to);
    }

    return price.to(to, String(this.exchangeRate));
  }
}
