import { FiatConverter } from "../fiatconverter.mjs";

import { NotImplementedError, ValueError } from "../../error.mjs";
import { Price } from "../../price.mjs";
import { Oracle } from "../oracle.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { CryptoResolver } from "../cryptoresolver.mjs";

export class ImplicitFiatConverter {
  readonly oracle: Oracle;
  readonly crypto: CryptoAsset;

  constructor(
    oracle: Oracle,
    crypto: CryptoAsset | null // XXX Check that once we have decided about CryptoResolver returning `null` vs throwing an exception
  ) {
    if (!crypto) {
      throw new ValueError(`The reference crypto-asset must be defined`);
    }

    this.oracle = oracle;
    this.crypto = crypto;
  }

  async convert(date: Date, price: Price, to: FiatCurrency): Promise<Price> {
    const from = price.fiatCurrency;

    // handle the trivial case
    if (from == to) {
      return price;
    }

    const ref = await this.oracle.getPrice(this, this.crypto, date, [from, to]); // XXX this may be re-entrant. Is it a problem?

    const conversion = ref[to].rate / ref[from].rate;

    return new Price(price.crypto, to, price.rate * conversion);
  }
}
