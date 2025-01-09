import { formatDate } from "../../date.mjs";
import { Price } from "../../price.mjs";
import { CryptoAsset } from "../../cryptoasset.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import { Provider } from "../../provider.mjs";
import { Oracle } from "../oracle.mjs";

const COINGECKO_API_BASE_ADDRESS = "https://api.coingecko.com/api/v3/";

const INTERNAL_TO_COINGECKO_ID: Record<string, string> = {
  bitcoin: "bitcoin",
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

export class CoinGecko extends Oracle {
  readonly provider: Provider;
  readonly ready;

  constructor(provider?: Provider) {
    super();
    if (!provider) {
      const api_key = process.env["COINGECKO_API_KEY"];
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
    crypto: CryptoAsset,
    date: Date,
    currencies: FiatCurrency[]
  ): Promise<Record<FiatCurrency, Price>> {
    const dateDdMmYyyy = formatDate("DD-MM-YYYY", date);
    const historical_data = await this.provider.fetch(
      `coins/${INTERNAL_TO_COINGECKO_ID[crypto.id]}/history`,
      {
        date: dateDdMmYyyy,
      }
    );
    const prices = historical_data.market_data.current_price;
    const result: Record<string, Price> = {};
    currencies.forEach(
      (currency) =>
        (result[currency] = new Price(crypto, currency, prices[currency]))
    );
    return result;
  }
}
