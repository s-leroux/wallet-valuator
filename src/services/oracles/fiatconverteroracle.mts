import type { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoRegistry } from "../../cryptoregistry.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";

import { FiatConverter } from "../fiatconverter.mjs";
import { Oracle } from "../oracle.mjs";
import type { PriceMap } from "../oracle.mjs";

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
    fiats: FiatCurrency[],
    fiatConverter: FiatConverter,
    result: PriceMap
  ): Promise<void> {
    let missing = fiats;
    let found = 0;

    // we DO NOT use concurrency here to avoid wasting API calls from our quotas
    const intermediateResult = new Map() as PriceMap;
    await this.backend.getPrice(
      registry,
      crypto,
      date,
      missing,
      fiatConverter,
      intermediateResult
    );

    for (const [currency, price] of intermediateResult) {
      found += 1;
      result.set(currency, price);
      missing = missing.filter((item) => item !== currency);
      // Above: not necessarily very efficient in the general case. But im practice,
      // the oracles tend to reply prices either with all asked fiat currencies, or none.
    }

    if (found && missing.length) {
      // We have some work to do: some requested currency were found other were not.
      const converter = this.converterFactory(this);
      for (const dest of missing) {
        const convertedPrice = await converter.convert(
          // ISSUE #63 Can we use parallel execution here without potentially wasting API calls quotas?
          registry,
          date,
          intermediateResult.get(this.referenceFiats[0])!, // ISSUE #62  We only consider the first reference fiat
          dest
        );
        result.set(dest, convertedPrice);
      }
    }
  }
}
