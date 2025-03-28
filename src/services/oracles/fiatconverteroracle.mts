import type { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoRegistry } from "../../cryptoregistry.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { Price } from "../../price.mjs";

import { NotImplementedError } from "../../error.mjs";
import { FiatConverter } from "../fiatconverter.mjs";
import { Oracle } from "../oracle.mjs";

/**
 * An adapter to support fiat conversion a part of an oracle tree.
 */
export class FiatConverterOracle extends Oracle {
  backend: Oracle;
  converterFactory: (oracle: Oracle) => FiatConverter;
  referenceCrypto: CryptoAsset;
  referenceFiats: FiatCurrency[];

  constructor(
    backend: Oracle,
    converterFactory: (oracle: Oracle) => FiatConverter,
    referenceCrypto: CryptoAsset,
    ...referenceFiats: [FiatCurrency, ...FiatCurrency[]]
  ) {
    super();
    this.backend = backend;
    this.converterFactory = converterFactory;
    this.referenceCrypto = referenceCrypto;
    this.referenceFiats = referenceFiats;
  }

  async getPrice(
    registry: CryptoRegistry,
    crypto: CryptoAsset,
    date: Date,
    fiat: FiatCurrency[],
    fiatConverter: FiatConverter
  ): Promise<Partial<Record<FiatCurrency, Price>>> {
    const result = {} as Record<FiatCurrency, Price>;
    let missing = fiat;
    let found = 0;

    // we DO NOT use concurrency here to avoid wasting API calls from our quotas
    const intermediateResult = await this.backend.getPrice(
      registry,
      crypto,
      date,
      missing,
      fiatConverter
    );
    for (const [currency, price] of Object.entries(intermediateResult) as [
      FiatCurrency,
      Price
    ][]) {
      found += 1;
      result[currency] = price;
      missing = missing.filter((item) => item !== currency);
      // Above: not necessarily very efficient in the general case. But im practice,
      // the oracles tend to reply prices either with all asked fiat currencies, or none.
    }
    if (found && missing.length) {
      // We have some work to do: some requested currency were found other were not.
      const converter = this.converterFactory(this);
      for (const dest of missing) {
        result[dest] = await converter.convert(
          // ISSUE #63 Can we use parallel execution here without potentially wasting API calls quotas?
          registry,
          date,
          result[this.referenceFiats[0]], // ISSUE #62  We only consider the first reference fiat
          dest
        );
      }
    }
    return result;
  }
}
