import { Provider } from "../../provider.mjs";
import { Oracle } from "../oracle.mjs";

const COINGECKO_API_BASE_ADDRESS = "https://api.coingecko.com/api/v3/";

interface Coin {
  id: string;
  symbol: string;
  name: string;
}

export class CoinGeckoProvider extends Provider {
  readonly api_key: string;

  constructor(api_key: string, options = {} as any) {
    super(COINGECKO_API_BASE_ADDRESS, options);
    this.api_key = api_key;
  }

  injectExtraParams(search_params) {
    search_params.set("x-cg-demo-api-key", this.api_key);
  }
}

export class CoinGecko implements Oracle {
  readonly provider: Provider;
  readonly symbol_to_coin: Map<string, Coin[]>;
  readonly ready;

  constructor(provider?: Provider) {
    if (!provider) {
      const api_key: string = process.env["COINGECKO_API_KEY"];
      if (!api_key) {
        throw Error(
          "You must specify a provider or define the COINGECKO_API_KEY environment variable"
        );
      }
      provider = new CoinGeckoProvider(api_key, {});
    }
    this.provider = provider;
    this.symbol_to_coin = new Map();
    this.ready = this.init();
  }

  async init() {
    await this.loadCoinList();
  }

  async loadCoinList() {
    const coin_list = await this.coinList();

    this.symbol_to_coin.clear();
    for (const coin of coin_list) {
      const coins = this.symbol_to_coin.get(coin.symbol);
      if (coins) {
        coins.push(coin);
      } else {
        this.symbol_to_coin.set(coin.symbol, [coin]);
      }
    }
  }

  async coinList(): Promise<Coin[]> {
    const result = await this.provider.fetch("coins/list", {});
    return result;
  }

  async symbolToIds(symbol: string): Promise<string[]> {
    await this.ready;
    const coins: Coin[] = this.symbol_to_coin.get(symbol) ?? [];
    return coins.map((item) => item.id);
  }

  getPrice(quoteCurrencySymbol, baseCurrencySymbol, date) {}
}
