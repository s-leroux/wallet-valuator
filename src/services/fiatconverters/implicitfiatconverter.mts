import { FiatConverter } from "../fiatconverter.mjs";

import { NotImplementedError } from "../../error.mjs";
import { Price } from "../../price.mjs";
import { Oracle } from "../oracle.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoAsset } from "../../cryptoasset.mjs";

export class ImplicitFiatConverter {
  constructor(readonly oracle: Oracle, readonly crypto: CryptoAsset | null) {}
  // FIXME Above, the crypto parameter accept null while ISSUE #40 is not solved

  async convert(date: Date, price: Price, to: FiatCurrency): Promise<Price> {
    const from = price.fiatCurrency;

    // handle the trivial case
    if (from == to) {
      return price;
    }

    if (!this.crypto) {
      throw new NotImplementedError();
    }
    const ref = await this.oracle.getPrice(this, this.crypto, date, [from, to]); // XXX this may be re-entrant. Is it a problem?

    const conversion = ref[to].rate / ref[from].rate;

    return new Price(price.crypto, to, price.rate * conversion);
  }
}
