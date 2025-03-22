import { Provider } from "../../provider.mjs";

const REALTOKEN_API_BASEADDRESS = "https://api.realtoken.community/";

export class RealTokenProvider extends Provider {
  constructor(
    base: string = REALTOKEN_API_BASEADDRESS,
    options = {} as Record<string, any>
  ) {
    super(base, options);
  }
}

export type RealToken = {
  fullName: string;
  shortName: string;
  symbol: string;
  productType: string;
  tokenPrice: number;
  currency: string;
  uuid: string;
  ethereumContract: string | null;
  xDaiContract: string | null;
  gnosisContract: string | null;
};

export type RealTokenEvent = {
  date: string; // YYYYMMDD
  values: Record<string, any>;
};

export type RealTokenHistory = {
  uuid: string;
  history: RealTokenEvent[];
};

export interface RealTokenAPI {
  token(): Promise<RealToken[]>;
  tokenHistory(): Promise<RealTokenHistory[]>;
}

export class DefaultRealTokenAPI implements RealTokenAPI {
  constructor(readonly provider: Provider) {}

  static create(base: string = REALTOKEN_API_BASEADDRESS) {
    return new DefaultRealTokenAPI(new RealTokenProvider(base));
  }

  token() {
    return this.provider.fetch("/v1/token") as Promise<RealToken[]>;
  }

  tokenHistory() {
    return this.provider.fetch("/v1/tokenHistory") as Promise<
      RealTokenHistory[]
    >;
  }
}
