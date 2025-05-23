import { FiatConverter } from "../../src/services/fiatconverter.mjs";

import { InconsistentUnitsError } from "../../src/error.mjs";
import type { Price } from "../../src/price.mjs";
import type { FiatCurrency } from "../../src/fiatcurrency.mjs";
import type { CryptoRegistry } from "../../src/cryptoregistry.mjs";

/**
 * A fake fiat converter that always scale by the same amount
 */
export class FixedFiatConverter extends FiatConverter {
  constructor(
    readonly from: FiatCurrency,
    readonly to: FiatCurrency,
    readonly exchangeRate: number
  ) {
    super();
  }

  static create(
    from: FiatCurrency,
    to: FiatCurrency,
    exchangeRate: number
  ): FiatConverter {
    return new FixedFiatConverter(from, to, exchangeRate);
  }

  async convert(
    registry: CryptoRegistry,
    date: Date,
    price: Price,
    to: FiatCurrency
  ): Promise<Price> {
    if (price.fiatCurrency !== this.from) {
      throw new InconsistentUnitsError(price.fiatCurrency, this.from);
    }
    if (to !== this.to) {
      throw new InconsistentUnitsError(to, this.to);
    }

    return price.to(to, this.exchangeRate);
  }
}
