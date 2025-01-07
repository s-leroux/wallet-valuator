import { CryptoAsset } from "../cryptoasset.mjs";
import { FiatCurrency } from "../fiatcurrency.mjs";
import { Price } from "../price.mjs";

export interface Oracle {
  getPrice(
    crypto: CryptoAsset,
    date: Date,
    fiat: FiatCurrency[]
  ): Promise<Record<FiatCurrency, Price>>;
}
