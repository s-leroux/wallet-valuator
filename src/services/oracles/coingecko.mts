import { Price } from "../../price.mjs";
import { Coin } from "../../coin.mjs";
import { Provider } from "../../provider.mjs";
import { Oracle, mangle } from "../oracle.mjs";

const COINGECKO_API_BASE_ADDRESS = "https://api.coingecko.com/api/v3/";

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

  injectExtraParams(search_params) {
    search_params.set("x-cg-demo-api-key", this.api_key);
  }
}

export class CoinGecko implements Oracle {
  readonly provider: Provider;
  readonly pc_to_coin: Map<string, Coin>; // maps platform/contract to a coin
  readonly ready;

  constructor(provider?: Provider) {
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

  async getPrice(coin: Coin, date, currencies): Promise<Record<string, Price>> {
    const historical_data = await this.provider.fetch(
      `coins/${coin.oracle_id}/history`,
      {
        date,
      }
    );
    const prices = historical_data.market_data.current_price;
    const result = {};
    currencies.forEach(
      (currency) =>
        (result[currency] = new Price(coin, currency, prices[currency]))
    );
    return result;
  }
}
