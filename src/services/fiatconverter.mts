import type { Price } from "../price.mts";
import type { FiatCurrency } from "../fiatcurrency.mts";
import type { CryptoRegistry } from "../cryptoregistry.mjs";

export abstract class FiatConverter {
  abstract convert(
    registry: CryptoRegistry,
    date: Date,
    from: Price,
    to: FiatCurrency
  ): Promise<Price>;
}
