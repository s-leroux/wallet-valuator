import { FiatConverter } from "../../src/services/fiatconverter.mjs";

import {
  NotImplementedError,
  InconsistentUnitsError,
} from "../../src/error.mjs";
import type { Price } from "../../src/price.mjs";
import type { FiatCurrency } from "../../src/fiatcurrency.mjs";

/**
 * A fake fiat converter that always raises an exception if used
 */
export class FakeFiatConverter extends FiatConverter {
  convert(date: Date, from: Price, to: FiatCurrency): Promise<Price> {
    throw new NotImplementedError();
  }
}

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

  async convert(date: Date, price: Price, to: FiatCurrency): Promise<Price> {
    if (price.fiatCurrency !== this.from) {
      throw new InconsistentUnitsError(price.fiatCurrency, this.from);
    }
    if (to !== this.to) {
      throw new InconsistentUnitsError(to, this.to);
    }

    return price.to(to, this.exchangeRate);
  }
}
