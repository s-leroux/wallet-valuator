import type { CryptoAsset } from "../cryptoasset.mjs";
import type { CryptoRegistry } from "../cryptoregistry.mjs";
import type { FiatCurrency } from "../fiatcurrency.mjs";
import type { FiatConverter } from "./fiatconverter.mjs";
import type { Price } from "../price.mjs";

import { Caching } from "./oracles/caching.mjs";

export abstract class Oracle {
  abstract getPrice(
    registry: CryptoRegistry,
    crypto: CryptoAsset,
    date: Date,
    fiat: FiatCurrency[]
  ): Promise<Record<FiatCurrency, Price>>;

  cache(path: string | undefined): Oracle {
    return new Caching(this, path);
  }
}
