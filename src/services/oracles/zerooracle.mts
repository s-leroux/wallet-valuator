import type { CryptoAsset } from "../../cryptoasset.mjs";
import type {
  CryptoMetadata,
  CryptoRegistryNG,
} from "../../cryptoregistry.mjs";
import { logger } from "../../debug.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import { GlobalPriceMetadata } from "../../price.mjs";

import { Oracle, type PriceMap } from "../oracle.mjs";

const log = logger("zerooracle");

/**
 * Oracle that reports a price of zero.
 * Useful for tests or neutral valuation where the crypto value should be treated as zero
 * (e.g. when the crypto is not listed yet on the primary oracles).
 */
export class ZeroOracle extends Oracle {
  // eslint-disable-next-line @typescript-eslint/require-await
  async getPrice(
    _registry: CryptoRegistryNG,
    _cryptoMetadata: CryptoMetadata,
    crypto: CryptoAsset,
    date: Date,
    fiats: Set<FiatCurrency>,
    result: PriceMap,
  ): Promise<void> {
    log.warn("C2103", `Price of ${crypto} at ${date} fallback to zero`);

    for (const fiat of fiats) {
      const price = GlobalPriceMetadata.setMetadata(crypto.price(fiat, "0"), {
        origin: "zerooracle",
        volatile: true,
      });
      result.set(fiat, price);
    }
  }

  static create() {
    return new ZeroOracle();
  }
}
