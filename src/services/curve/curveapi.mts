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
//  Utilities
//==========================================================================

// Our application and the Curve API have some mismatch in their block chain
// naming convention. Notably the `gnosis` chain (in our application) is
// named `xdai` (its obsolete name) in the Curve API.
// We provide the ToCurveChainName and FromCurveChainName tools to perform
//  the conversion in line:

const ToCurveChainName: Record<string, string> = {
  // @ts-expect-error The null-prototype literal object syntax is not supported by TypeScript
  __proto__: null,

  gnosis: "xdai",
} as const;

const FromCurveChainName: Record<string, string> = {
  // @ts-expect-error The null-prototype literal object syntax is not supported by TypeScript
  __proto__: null,

  xdai: "gnosis",
} as const;

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
    const promise = this.provider.fetch(url) as Promise<CurveChainList>;
    return promise.then((result) => {
      result.data.forEach((item) => {
        const externalName = FromCurveChainName[item.name];
        if (externalName) {
          item.name = externalName;
        }
      });
      return result;
    });
  }

  async getChainContracts(chainName: string): Promise<CurveContractList> {
    const internalChainName = ToCurveChainName[chainName] ?? chainName;

    const url = ["/v1/chains", encodeURIComponent(internalChainName)].join("/");

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
   * @param chainName - The blockchain name (e.g. "ethereum", "gnosis")
   * @returns Promise containing list of token addresses and their current USD prices
   */
  getAllUSDPrices(chainName: string): Promise<CurvePriceList> {
    const internalChainName = ToCurveChainName[chainName] ?? chainName;
    const url = ["/v1/usd_price", encodeURIComponent(internalChainName)].join(
      "/"
    );

    return this.provider.fetch(url) as Promise<CurvePriceList>;
  }

  getUSDPrice(
    chainName: string,
    tokenAddress: string,
    date: Date
  ): Promise<CurvePriceHistory> {
    const internalChainName = ToCurveChainName[chainName] ?? chainName;
    const start = Math.floor(date.getTime() / 1000);
    const end = start + 24 * 3600;

    const url = [
      "/v1/usd_price",
      encodeURIComponent(internalChainName),
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
