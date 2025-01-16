import { FiatConverter } from "../../src/services/fiatconverter.mjs";

import { NotImplementedError } from "../../src/error.mjs";
import type { Price } from "../../src/price.mjs";
import type { FiatCurrency } from "../../src/fiatcurrency.mjs";

export class FakeFiatConverter extends FiatConverter {
  convert(date: Date, from: Price, to: FiatCurrency): Promise<Price> {
    throw new NotImplementedError();
  }
}
