import { FiatConverter, NullFiatConverter } from "../fiatconverter.mjs";

import { NotImplementedError, ValueError } from "../../error.mjs";
import { Price } from "../../price.mjs";
import { Oracle } from "../oracle.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";

export class ImplicitFiatConverter implements FiatConverter {
  readonly oracle: Oracle;
  readonly crypto: CryptoAsset;

  constructor(
    oracle: Oracle,
    crypto: CryptoAsset | undefined // ISSUE #45 Check that once we have decided about CryptoResolver returning `null` vs throwing an exception
  ) {
    if (!crypto) {
      throw new ValueError(`The reference crypto-asset must be defined`);
    }

    this.oracle = oracle;
    this.crypto = crypto;
  }

  static create(oracle: Oracle, crypto: CryptoAsset) {
    return new ImplicitFiatConverter(oracle, crypto);
  }

  async convert(
    registry: CryptoRegistry,
    date: Date,
    price: Price,
    to: FiatCurrency
  ): Promise<Price> {
    const from = price.fiatCurrency;

    // handle the trivial case
    if (from == to) {
      return price;
    }

    const ref = await this.oracle.getPrice(
      registry,
      this.crypto,
      date,
      [from, to],
      new NullFiatConverter() // We might use `this` here but isn't there some cases leading to infinite recursion?
    ); // ISSUE #64 What to do if this fails?

    const toPrice = ref[to];
    const fromPrice = ref[from];

    if (toPrice === undefined || fromPrice === undefined) {
      throw new NotImplementedError(
        "Unable to find the reference prices.\nSee ISSUE #94"
      );
    }

    const exchangeRage = toPrice.rate.div(fromPrice.rate);

    return price.to(to, exchangeRage);
  }
}
