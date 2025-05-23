import { formatDate } from "../../date.mjs";
import { Price } from "../../price.mjs";
import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import { Provider } from "../../provider.mjs";
import { Oracle } from "../oracle.mjs";

import { logger as logger } from "../../debug.mjs";
import { GlobalMetadataRegistry } from "../../metadata.mjs";

const log = logger("coingecko");

const COINGECKO_API_BASE_ADDRESS = "https://api.coingecko.com/api/v3/";
const MAX_HISTORICAL_ATTEMPTS = 30; // try up to 30 days in the past to find a price

export type InternalToCoinGeckoIdMapping = {
  [K in string]?: string;
};

/**
 * Handle the idiosyncrasies of the CoinGecko API server
 */
export class CoinGeckoProvider extends Provider {
  readonly api_key: string;

  constructor(
    api_key: string,
    origin: string = COINGECKO_API_BASE_ADDRESS,
    options = {} as object
  ) {
    const defaults = {
      retry: 40,
      concurrency: 3,
    };
    super(origin, Object.assign(defaults, options));
    this.api_key = api_key;
  }

  injectExtraParams(search_params: URLSearchParams) {
    search_params.set("x-cg-demo-api-key", this.api_key);
  }
}

type OptionBag = {};

export class CoinGecko extends Oracle {
  readonly provider: Provider;
  readonly idMapping;
  readonly ready;

  constructor(provider?: Provider, idMapping?: InternalToCoinGeckoIdMapping) {
    super();
    if (!provider) {
      const api_key = process.env["COINGECKO_API_KEY"];
      // ISSUE #25 Check if implicit key retrieval from the environment is:
      // (1) coherent in the whole library
      // (2) desirable
      if (!api_key) {
        throw Error(
          "You must specify a provider or define the COINGECKO_API_KEY environment variable"
        );
      }
      provider = new CoinGeckoProvider(api_key);
    }
    this.provider = provider;
    this.idMapping = idMapping;
    this.ready = this.init();
  }

  static create(
    api_key: string,
    idMapping: InternalToCoinGeckoIdMapping | undefined = undefined,
    options = {} as OptionBag & { origin?: string } // XXX Not the canonical way to use option bags
  ) {
    return new CoinGecko(
      new CoinGeckoProvider(
        api_key,
        options?.origin ?? COINGECKO_API_BASE_ADDRESS,
        options
      ),
      idMapping
    );
  }

  async init() {}

  async getPrice(
    registry: CryptoRegistry,
    crypto: CryptoAsset,
    date: Date,
    currencies: FiatCurrency[]
  ): Promise<Partial<Record<FiatCurrency, Price>>> {
    let prices;
    let historical_data;
    const coinGeckoId = getCoinGeckoId(registry, crypto, this.idMapping);
    if (!coinGeckoId) {
      return Object.create(null);
    }
    try {
      const pricing_date = new Date(date);
      for (let i = 0; i < MAX_HISTORICAL_ATTEMPTS; ++i) {
        historical_data = await this.provider.fetch(
          `coins/${encodeURIComponent(coinGeckoId)}/history`,
          {
            date: formatDate("DD-MM-YYYY", pricing_date),
          }
        );
        // XXX market_data may be undefined if there was no price at the given date
        if (historical_data.market_data) break;

        // Try one day earlier
        pricing_date.setDate(pricing_date.getDate() - 1);
        log.trace(
          "C9999",
          "No price found. Retrying one day earlier",
          pricing_date,
          crypto
        );
      }
      prices = historical_data.market_data.current_price;
    } catch (err) {
      log.trace(
        "C9999",
        "getPrice ERR",
        date,
        currencies,
        crypto,
        coinGeckoId,
        historical_data,
        err
      );
      prices = Object.create(null);
    }

    const result: Record<FiatCurrency, Price> = Object.create(null);
    log.info("C1002", `Found price for ${crypto} at ${date.toISOString()}`);
    for (const [key, value] of Object.entries(prices)) {
      let currency;
      try {
        currency = FiatCurrency(key);
      } catch {
        continue;
      }
      result[currency] = GlobalMetadataRegistry.setMetadata(
        new Price(crypto, currency, value as string),
        { origin: "COINGECKO" } // XXX Why all-caps?
      );
    }

    return result;
  }
}

export function getCoinGeckoId(
  registry: CryptoRegistry,
  crypto: CryptoAsset,
  internalId?: InternalToCoinGeckoIdMapping
): string | undefined {
  // 1. Check the standard metadata
  const metadata = registry.getNamespaces(crypto);
  const id = metadata?.STANDARD?.coingeckoId;
  if (id) {
    return id;
  }

  // 2. Use the internal table
  return internalToCoinGeckoId(crypto.id, internalId);
}

function internalToCoinGeckoId(
  internalId: string,
  idMapping?: InternalToCoinGeckoIdMapping
): string | undefined {
  const coinGeckoId = idMapping?.[internalId];

  if (coinGeckoId !== undefined) {
    return coinGeckoId;
  }

  console.log("CoinGecko id not known for %s.", internalId);
  return undefined;
}
