import type { Price } from "../price.mts";
import type { FiatCurrency } from "../fiatcurrency.mts";

export abstract class FiatConverter {
  abstract convert(date: Date, from: Price, to: FiatCurrency): Promise<Price>;
}
