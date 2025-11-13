import type { CryptoAsset } from "../../cryptoasset.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoRegistryNG } from "../../cryptoregistry.mjs";

import { Oracle } from "../oracle.mjs";
import { GlobalPriceMetadata } from "../../price.mjs";
import { DefaultDefiLlamaAPI, DefiLlamaAPI } from "./defillamaapi.mjs";
import {
  getCoinGeckoId,
  InternalToCoinGeckoIdMapping,
} from "../oracles/coingecko.mjs";
import { logger } from "../../debug.mjs";
import type { PriceMap } from "../oracle.mjs";
import type { CryptoMetadata } from "../../cryptoregistry.mjs";
import {
  baseConfidenceForOrigin,
  DEFAULT_BASE_CONFIDENCE,
  normalizeConfidence,
} from "../../priceconfidence.mjs";

const log = logger("defillama-oracle");

const USD = FiatCurrency("USD");

export class DefiLlamaOracle extends Oracle {
  private constructor(
    readonly api: DefiLlamaAPI,
    readonly idMapping?: InternalToCoinGeckoIdMapping
  ) {
    super();
  }

  async getPrice(
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    crypto: CryptoAsset,
    date: Date,
    fiats: Set<FiatCurrency>,
    result: PriceMap
  ): Promise<void> {
    const coinGeckoId = getCoinGeckoId(
      cryptoRegistry,
      cryptoMetadata,
      crypto,
      this.idMapping
    );
    if (!coinGeckoId) {
      // ISSUE #105 We could query other metadata such as the canonical ChainAddress for the crypto-asset
      return;
    }

    const assetId = `coingecko:${coinGeckoId}`;
    const prices = await this.api.getHistoricalPrices(date, [assetId]);
    const { price, confidence } = prices.coins[assetId]; // USD price!
    const priceAsUSD = GlobalPriceMetadata.setMetadata(
      crypto.price(USD, price),
      {
        origin: "DEFILLAMA",
        confidence: normalizeConfidence(
          confidence,
          baseConfidenceForOrigin("DEFILLAMA") ?? DEFAULT_BASE_CONFIDENCE
        ),
      }
    );
    result.set(USD, priceAsUSD);
    log.info("C1003", `Found price for ${crypto}/USD at ${date.toISOString()}`);
    /*
    for (const fiat of fiats) {
      if (fiat !== USD) {
        const convertedPrice = await fiatConverter.convert(
          registry,
          date,
          priceAsUSD,
          fiat
        );
        result.set(fiat, convertedPrice);
      }
    }
    */
  }

  static create(api?: DefiLlamaAPI, idMapping?: InternalToCoinGeckoIdMapping) {
    return new DefiLlamaOracle(api ?? DefaultDefiLlamaAPI.create(), idMapping);
  }
}
