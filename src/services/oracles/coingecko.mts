import { formatDate } from "../../date.mjs";
import { Price } from "../../price.mjs";
import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import { Provider } from "../../provider.mjs";
import { Oracle } from "../oracle.mjs";

const COINGECKO_API_BASE_ADDRESS = "https://api.coingecko.com/api/v3/";

const INTERNAL_TO_COINGECKO_ID: Record<string, string> = {
  bitcoin: "bitcoin",
};

function internalToCoinGeckoId(internalId: string): string {
  const coinGeckoId = INTERNAL_TO_COINGECKO_ID[internalId];

  if (coinGeckoId !== undefined) {
    return coinGeckoId;
  }

  console.log(
    "CoinGecko id not known for %s. Returning unchanged.",
    internalId
  );
  return internalId.toLowerCase();
}

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

export class CoinGecko extends Oracle {
  readonly provider: Provider;
  readonly ready;

  constructor(provider?: Provider) {
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
    this.ready = this.init();
  }

  static create(
    api_key: string,
    origin: string = COINGECKO_API_BASE_ADDRESS,
    options = {} as any
  ) {
    return new CoinGecko(new CoinGeckoProvider(api_key, origin, options));
  }

  async init() {}

  async getPrice(
    registry: CryptoRegistry,
    crypto: CryptoAsset,
    date: Date,
    currencies: FiatCurrency[]
  ): Promise<Record<FiatCurrency, Price>> {
    const dateDdMmYyyy = formatDate("DD-MM-YYYY", date);

    let prices;
    try {
      const historical_data = await this.provider.fetch(
        `coins/${encodeURIComponent(internalToCoinGeckoId(crypto.id))}/history`,
        {
          date: dateDdMmYyyy,
        }
      );
      prices = historical_data.market_data.current_price;
    } catch (err) {
      prices = Object.create(null);
    }
    const result: Record<string, Price> = Object.create(null);
    for (const currency of currencies) {
      if (Object.hasOwn(prices, currency)) {
        result[currency] = new Price(crypto, currency, prices[currency]);
      }
    }

    return result;
  }
}
