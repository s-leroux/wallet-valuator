import { Provider } from "../../provider.mjs";

const CURVE_API_BASEADDRESS = "https://prices.curve.fi/";

//==========================================================================
//  Provider
//==========================================================================

export class CurveProvider extends Provider {
  constructor(
    base: string = CURVE_API_BASEADDRESS,
    options = {} as Record<string, any>
  ) {
    super(base, options);
  }
}

//==========================================================================
//  Domain types
//==========================================================================

export type CurvePriceHistory = {
  address: string;
  data: { price: number; timestamp: string }[];
};

export type CurvePriceList = {
  data: {
    address: string;
    usd_price: number;
    last_updated: string; // ISO format
  }[];
};

export type CurveChainList = {
  data: { name: string }[];
};

type Pagination = {
  count: number;
  page: number;
  per_page: number;
};

export type CurveContractList = {
  chain: string;
  data: {
    name: string;
    address: string;
  }[];
};

//==========================================================================
//  API
//==========================================================================

export class DefaultCurveAPI {
  constructor(readonly provider: Provider) {}

  static create(base: string = CURVE_API_BASEADDRESS): CurveAPI {
    return new DefaultCurveAPI(new CurveProvider(base));
  }

  getChains(): Promise<CurveChainList> {
    const url = "/v1/chains/";
    return this.provider.fetch(url) as Promise<CurveChainList>;
  }

  async getChainContracts(chainName: string): Promise<CurveContractList> {
    const url = ["/v1/chains", encodeURIComponent(chainName)].join("/");

    const result: CurveContractList = {
      chain: chainName,
      data: [],
    };
    const contracts = result.data;

    let pageNumber = 0;
    const contractsPerPage = 300;
    while (true) {
      pageNumber += 1;
      const promise = this.provider.fetch(url, {
        page: pageNumber,
        per_page: contractsPerPage,
      }) as Promise<CurveContractList & Pagination>;
      const page = await promise;

      // The remote API does not seem to handle pagination properly
      // so we will simply loop until there are o more data to retrieve
      if (page.data.length) {
        contracts.push(...page.data); // ensure contractsPerPage will not exceed the spead operator capacity
      } else {
        break;
      }
    }
    return result;
  }

  /**
   * Returns the current USD price for all supported tokens in a chain.
   *
   * This can be used as a quick solution to get all token addresses of LP tokens in a Pool.
   * Note: For a more precise way to get pool tokens, consider using the `/v1/getPools/all/{blockchainId}`
   * endpoint from `api.curve.fi` instead of this `prices.curve.fi` endpoint.
   *
   * @param chain - The blockchain name (e.g. "ethereum", "xdai")
   * @returns Promise containing list of token addresses and their current USD prices
   */
  getAllUSDPrices(chain: string): Promise<CurvePriceList> {
    const url = ["/v1/usd_price", encodeURIComponent(chain)].join("/");

    return this.provider.fetch(url) as Promise<CurvePriceList>;
  }

  getUSDPrice(
    chain: string,
    tokenAddress: string,
    date: Date
  ): Promise<CurvePriceHistory> {
    const start = Math.floor(date.getTime() / 1000);
    const end = start + 24 * 3600;

    const url = [
      "/v1/usd_price",
      encodeURIComponent(chain),
      encodeURIComponent(tokenAddress),
      "history",
    ].join("/");

    return this.provider.fetch(url, {
      start,
      end,
    }) as Promise<CurvePriceHistory>;
  }
}

export type CurveAPI = Pick<
  DefaultCurveAPI,
  "getUSDPrice" | "getChains" | "getChainContracts" | "getAllUSDPrices"
>;
