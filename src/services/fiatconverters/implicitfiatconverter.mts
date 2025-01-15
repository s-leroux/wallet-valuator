import { FiatConverter } from "../fiatconverter.mjs";

import { Price } from "../../price.mjs";
import { Oracle } from "../oracle.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoAsset } from "../../cryptoasset.mjs";

export class ImplicitFiatConverter {
  constructor(readonly oracle: Oracle, readonly crypto: CryptoAsset) {}

  async convert(date: Date, price: Price, to: FiatCurrency): Promise<Price> {
    const from = price.fiatCurrency;

    // handle the trivial case
    if (from == to) {
      return price;
    }

    const ref = await this.oracle.getPrice(this.crypto, date, [from, to]);

    const conversion = ref[to].rate / ref[from].rate;

    return new Price(price.crypto, to, price.rate * conversion);
  }
}
