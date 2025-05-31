// ===========================================================================
//  Imports
// ===========================================================================
import { Provider, type ProviderOptionBag } from "../../provider.mjs";

// ===========================================================================
//  Constants
// ===========================================================================
const DEFILLAMA_API_BASE = "https://coins.llama.fi";

// ===========================================================================
//  Provider
// ===========================================================================
export class DefiLlamaProvider extends Provider {
  constructor(
    base: string = DEFILLAMA_API_BASE,
    options: ProviderOptionBag = {}
  ) {
    super(base, options);
  }
}

// ===========================================================================
//  Domain Types
// ===========================================================================

export type DefiLlamaPriceData = {
  coins: {
    [key: string]: {
      price: number;
      symbol: string;
      timestamp: number;
      decimals?: number;
      confidence?: number;
    };
  };
};

// ===========================================================================
//  Utilities
// ===========================================================================

/**
 * Converts a JavaScript Date object to Unix timestamp (seconds since epoch) as expected by the DefiLlama API.
 *
 * @param date - The date to convert
 * @returns Unix timestamp in seconds
 */
function toDefiLlamaDate(date: Date) {
  return Math.floor(date.getTime() / 1000); // ISSUE #101 Should we round that to the nearest day?
}

// ===========================================================================
//  API
// ===========================================================================

export class DefaultDefiLlamaAPI {
  constructor(readonly provider: Provider) {}

  static create(base: string = DEFILLAMA_API_BASE): DefiLlamaAPI {
    return new DefaultDefiLlamaAPI(new DefiLlamaProvider(base));
  }

  /**
   * Retrieve historical token prices by timestamp and contract addresses.
   *
   * @param timestamp - Unix timestamp (in seconds) of the desired date.
   * @param coins - Array of contract addresses prefixed with the chain name (e.g. 'ethereum:0x...').
   * @returns A promise resolving to the historical price data.
   */
  getHistoricalPrices(
    date: Date,
    coins: string[]
  ): Promise<DefiLlamaPriceData> {
    const encodedCoins = coins.map(encodeURIComponent).join(",");
    const url = [
      "/prices/historical",
      toDefiLlamaDate(date),
      encodedCoins,
    ].join("/");

    return this.provider.fetch(url, {
      searchWidth: "6h",
    }) as Promise<DefiLlamaPriceData>;
  }
}

export type DefiLlamaAPI = Pick<DefaultDefiLlamaAPI, "getHistoricalPrices">;
