import { formatDate } from "../../date.mjs";
import { Price } from "../../price.mjs";
import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import { Provider } from "../../provider.mjs";
import { Oracle } from "../oracle.mjs";

import { logger as logger } from "../../debug.mjs";
import { GlobalMetadataStore } from "../../metadata.mjs";
import { PriceMap } from "../oracle.mjs";
import { Ensure } from "../../type.mjs";
import { CryptoMetadata } from "../../cryptoregistry.mjs";

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
  private readonly apiKey: string;

  constructor(
    apiKey: string,
    origin: string = COINGECKO_API_BASE_ADDRESS,
    options: CoinGeckoOptionBag = {},
  ) {
    const defaults = {
      retry: 40,
      concurrency: 3,
    };
    super(origin, Object.assign(defaults, options));

    this.apiKey = apiKey;
  }

  injectExtraParams(search_params: URLSearchParams) {
    search_params.set("x-cg-demo-api-key", this.apiKey);
  }
}

//==========================================================================
//  Domain types
//==========================================================================

export type CoinGeckoPriceHistory = {
  market_data: {
    current_price: Record<string, number | undefined>;
  };
};

//==========================================================================
//  CoinGecko API
//==========================================================================

export class DefaultCoinGeckoAPI {
  constructor(readonly provider: Provider) {}

  static create(
    apiKey: string,
    base: string = COINGECKO_API_BASE_ADDRESS,
    options: CoinGeckoOptionBag = {},
  ) {
    return new DefaultCoinGeckoAPI(
      new CoinGeckoProvider(apiKey, base, options),
    );
  }

  getCoinsHistory(coinGeckoId: string, date: Date) {
    const encodedCoinGeckoId = encodeURIComponent(coinGeckoId);
    const url = ["coins", encodedCoinGeckoId, "history"].join("/");

    return this.provider.fetch(url, {
      date: formatDate("DD-MM-YYYY", date),
    }) as Promise<CoinGeckoPriceHistory>;
  }
}

type CoinGeckoOptionBag = {
  apiKey?: string;
};

export type CoinGeckoAPI = Pick<DefaultCoinGeckoAPI, "getCoinsHistory">;

//==========================================================================
//  CoinGecko Oracle
//==========================================================================

export class CoinGeckoOracle extends Oracle {
  readonly ready;

  constructor(
    readonly api: CoinGeckoAPI,
    readonly idMapping?: InternalToCoinGeckoIdMapping,
    options: CoinGeckoOptionBag = {},
  ) {
    super();

    this.ready = this.init();
  }

  /**
   * Creates a new CoinGeckoOracle instance with flexible configuration options.
   *
   * @param api - Either a custom CoinGeckoAPI instance or an API key string. If undefined,
   *             attempts to use the COINGECKO_API_KEY environment variable.
   * @param idMapping - Optional mapping between internal asset IDs and CoinGecko IDs.
   * @param options - Additional configuration options for the API client.
   *
   * @throws {Error} If no API key is provided and COINGECKO_API_KEY environment variable is not set.
   *
   * @example
   * // Using environment variable
   * const oracle = CoinGeckoOracle.create();
   *
   * @example
   * // Using API key string
   * const oracle = CoinGeckoOracle.create('your-api-key');
   *
   * @example
   * // Using custom API instance
   * const api = DefaultCoinGeckoAPI.create('your-api-key');
   * const oracle = CoinGeckoOracle.create(api);
   */
  static create(
    api?: CoinGeckoAPI | string,
    idMapping?: InternalToCoinGeckoIdMapping,
    options: CoinGeckoOptionBag = {},
  ) {
    if (api === undefined) {
      api = process.env["COINGECKO_API_KEY"];
      // ISSUE #25 Check if implicit key retrieval from the environment is:
      // (1) coherent in the whole library
      // (2) desirable
      if (!api) {
        throw Error(
          "You must specify a provider or define the COINGECKO_API_KEY environment variable",
        );
      }
    }

    if (typeof api === "string") {
      api = DefaultCoinGeckoAPI.create(
        api,
        COINGECKO_API_BASE_ADDRESS,
        options,
      );
    }
    return new CoinGeckoOracle(api, idMapping);
  }

  async init() {}

  async getPrice(
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    crypto: CryptoAsset,
    date: Date,
    fiats: Set<FiatCurrency>,
    result: PriceMap,
  ): Promise<void> {
    let historical_data: CoinGeckoPriceHistory | undefined;
    const coinGeckoId = getCoinGeckoId(
      cryptoRegistry,
      cryptoMetadata,
      crypto,
      this.idMapping,
    );
    if (!coinGeckoId) {
      return;
    }
    try {
      const pricing_date = new Date(date);
      for (let i = 0; i < MAX_HISTORICAL_ATTEMPTS; ++i) {
        historical_data = await this.api.getCoinsHistory(
          coinGeckoId,
          pricing_date,
        );
        // ISSUE #111 market_data might be undefined if there is no price for the given date
        if (historical_data.market_data) break;

        // Try one day earlier
        pricing_date.setDate(pricing_date.getDate() - 1);
        log.trace(
          "C1008",
          `No price found for ${crypto.id} at ${pricing_date}. Retrying one day earlier`,
          crypto.id,
        );
      }

      Ensure.isDefined(historical_data && historical_data.market_data); // throw an error if the data are mising
    } catch (err) {
      log.trace("C1009", `Error while getting price for ${crypto}: ${err}`);
      log.debug(date, fiats, crypto.id, coinGeckoId, historical_data, err);
      return;
    }
    const prices = Ensure.isDefined(historical_data).market_data.current_price;

    for (const [key, value] of Object.entries(prices)) {
      // Sanitize input
      let currency;
      try {
        currency = FiatCurrency(key); // Some keys are NOT proper ISO 4712 trigrams ("bits", "sats", "link")
      } catch {
        continue; // just ignore
      }

      if (value === undefined) {
        continue;
      }

      // Everything is OK
      log.trace(
        "C1002",
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        `Found price for ${crypto}/${currency} at ${date.toISOString()}`,
      );
      const price = new Price(crypto, currency, value);
      result.set(currency, price);
      GlobalMetadataStore.setMetadata(
        price,
        { origin: "COINGECKO" }, // ISSUE #112 Why all-caps?
      );
    }

    return;
  }
}

export function getCoinGeckoId(
  cryptoRegistry: CryptoRegistryNG,
  cryptoMetadata: CryptoMetadata,
  cryptoAsset: CryptoAsset,
  internalId?: InternalToCoinGeckoIdMapping,
): string | undefined {
  // 1. Check the standard metadata
  const metadata = cryptoMetadata.getMetadata(cryptoAsset);
  const id = metadata.coingeckoId;
  if (id) {
    return id;
  }

  // 2. Use the internal table
  return internalToCoinGeckoId(cryptoAsset.id, internalId);
}

function internalToCoinGeckoId(
  internalId: string,
  idMapping?: InternalToCoinGeckoIdMapping,
): string | undefined {
  const coinGeckoId = idMapping?.[internalId];

  if (coinGeckoId !== undefined) {
    return coinGeckoId;
  }

  return undefined;
}
