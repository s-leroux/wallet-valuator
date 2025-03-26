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
//  Interfaces
//==========================================================================

export type CurvePriceHistory = {
  address: string;
  data: { price: number; timestamp: string }[];
};

//==========================================================================
//  API
//==========================================================================

export class CurveAPI {
  constructor(readonly provider: Provider) {}

  static create(base: string = CURVE_API_BASEADDRESS) {
    return new CurveAPI(new CurveProvider(base));
  }

  async getUSDPrice(
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
