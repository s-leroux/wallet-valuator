import type { Price } from "../price.mts";
import type { FiatCurrency } from "../fiatcurrency.mts";
import type { CryptoRegistryNG } from "../cryptoregistry.mjs";
import { NotImplementedError } from "../error.mjs";

export abstract class FiatConverter {
  abstract convert(
    cryptoRegistry: CryptoRegistryNG,
    date: Date,
    from: Price,
    to: FiatCurrency
  ): Promise<Price>;
}

/**
 * A fiat converter that always raises an exception if used
 */
export class NullFiatConverter extends FiatConverter {
  convert(
    registry: CryptoRegistryNG,
    date: Date,
    from: Price,
    to: FiatCurrency
  ): Promise<Price> {
    throw new NotImplementedError();
  }

  static create(): FiatConverter {
    return new NullFiatConverter();
  }
}
