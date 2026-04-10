import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { CryptoMetadata, CryptoRegistryNG } from "../../cryptoregistry.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";

import { Oracle, type PriceMap } from "../oracle.mjs";

/**
 * Oracle that reports a zero exchange rate for every requested fiat currency.
 * Useful for tests or neutral valuation where fiat value should be treated as zero.
 */
export class ZeroOracle extends Oracle {
  // eslint-disable-next-line @typescript-eslint/require-await
  async getPrice(
    _registry: CryptoRegistryNG,
    _cryptoMetadata: CryptoMetadata,
    crypto: CryptoAsset,
    _date: Date,
    fiats: Set<FiatCurrency>,
    result: PriceMap,
  ): Promise<void> {
    for (const fiat of fiats) {
      result.set(fiat, crypto.price(fiat, "0"));
    }
  }
}
