import type { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoMetadata } from "../../cryptometadata.mjs";

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
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    crypto: CryptoAsset,
    date: Date,
    fiats: Set<FiatCurrency>,
    result: PriceMap
  ): Promise<void> {
    const missing = new Set(fiats);
    let found = 0;

    // we DO NOT use concurrency here to avoid wasting API calls from our quotas
    const intermediateResult = new Map() as PriceMap;
    await this.backend.getPrice(
      cryptoRegistry,
      cryptoMetadata,
      crypto,
      date,
      missing,
      intermediateResult
    );

    for (const [currency, price] of intermediateResult) {
      found += 1;
      result.set(currency, price);
      missing.delete(currency);
      // Above: not necessarily very efficient in the general case. But im practice,
      // the oracles tend to reply prices either with all asked fiat currencies, or none.
    }

    if (found && missing.size) {
      // We have some work to do: some requested currency were found other were not.
      const converter = this.converterFactory(this);
      for (const dest of missing) {
        const convertedPrice = await converter.convert(
          // ISSUE #63 Can we use parallel execution here without potentially wasting API calls quotas?
          cryptoRegistry,
          date,
          intermediateResult.get(this.referenceFiats[0])!, // ISSUE #62  We only consider the first reference fiat
          dest
        );
        result.set(dest, convertedPrice);
      }
    }
  }
}
