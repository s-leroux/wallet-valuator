import { formatDate } from "../../date.mjs";
import { Price } from "../../price.mjs";
import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import { Provider } from "../../provider.mjs";
import { Oracle } from "../oracle.mjs";

const COINGECKO_API_BASE_ADDRESS = "https://api.coingecko.com/api/v3/";

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
    options = {} as any
  ) {
    const defaults = {
      retry: 40,
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
    options = {} as OptionBag & { origin?: string }
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
    const dateDdMmYyyy = formatDate("DD-MM-YYYY", date);

    let prices;
    try {
      const coinGeckoId = this.getCoinGeckoId(registry, crypto);
      const historical_data = await this.provider.fetch(
        `coins/${encodeURIComponent(coinGeckoId)}/history`,
        {
          date: dateDdMmYyyy,
        }
      );
      prices = historical_data.market_data.current_price;
    } catch (err) {
      console.log("getPrice ERR", date, currencies, err);
      prices = Object.create(null);
    }
    const result: Record<string, Price> = Object.create(null);
    for (const currency of currencies) {
      const key = currency.toLowerCase(); // Don't make any assumption regarding the FiatCurrency case
      if (Object.hasOwn(prices, key)) {
        result[currency] = new Price(crypto, currency, prices[key]);
      }
    }

    return result;
  }

  getCoinGeckoId(registry: CryptoRegistry, crypto: CryptoAsset): string {
    // 1. Check the standard metadata
    const metadata = registry.getAssetData(crypto);
    const id = metadata?.STANDARD?.coingeckoId;
    if (id) {
      return id;
    }

    // 2. Use the internal table
    return this.internalToCoinGeckoId(crypto.id);
  }

  internalToCoinGeckoId(internalId: string): string {
    const coinGeckoId = this.idMapping?.[internalId];

    if (coinGeckoId !== undefined) {
      return coinGeckoId;
    }

    console.log(
      "CoinGecko id not known for %s. Returning unchanged.",
      internalId
    );
    return internalId.toLowerCase();
  }
}
