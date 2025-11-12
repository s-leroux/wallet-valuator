import { logger } from "../../debug.mjs";
import { Logged } from "../../errorutils.mjs";
import { Provider, ProviderOptionBag } from "../../provider.mjs";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const log = logger("realtokenapi");

const REALTOKEN_API_BASEADDRESS = "https://api.realtoken.community/";

export class RealTokenProvider extends Provider {
  private readonly apiKey: string | null;

  constructor(
    apiKey: string | null,
    base: string = REALTOKEN_API_BASEADDRESS,
    options: ProviderOptionBag = {}
  ) {
    if (apiKey !== null && (typeof apiKey !== "string" || apiKey === "")) {
      throw Logged(
        "C3017",
        TypeError,
        `Invalid API key: expected null or non-empty string, got "${apiKey}"`
      );
    }
    super(base, options);
  }

  buildCustomHeaders(url: URL): Record<string, string> {
    const xxx = super.buildCustomHeaders(url);
    const apiKey = this.apiKey;

    if (apiKey) {
      Object.assign(xxx, {
        "X-AUTH-REALT-TOKEN": apiKey,
      });
    }
    return xxx;
  }
}

export type RealToken = RealTokenBase | (RealTokenBase & RealTokenExtended);
type RealTokenBase = {
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

type RealTokenExtended = {
  goerliContract: string | null;
  totalInvestment: number;
  grossRentYear: number;
  grossRentMonth: number;
  propertyManagement: number;
  propertyManagementPercent: number;
  realtPlatform: number;
  realtPlatformPercent: number;
  insurance: number;
  propertyTaxes: number;
  utilities: number;
  initialMaintenanceReserve: number | null;
  netRentDay: number;
  netRentMonth: number;
  netRentYear: number;
  netRentDayPerToken: number;
  netRentMonthPerToken: number;
  netRentYearPerToken: number;
  annualPercentageYield: number;
  coordinate: {
    lat: string;
    lng: string;
  };
  marketplaceLink: string;
  imageLink: string[];
  propertyType: number;
  propertyTypeName: string;
  squareFeet: number;
  lotSize: number;
  bedroomBath: string;
  hasTenants: boolean | null;
  rentedUnits: number;
  totalUnits: number;
  termOfLease: string | null;
  renewalDate: string | null;
  section8paid: boolean | null;
  subsidyStatus: string;
  subsidyStatusValue: string | null;
  subsidyBy: string | null;
  sellPropertyTo: string;
  secondaryMarketplace: {
    UniswapV1: number;
    UniswapV2: number;
  };
  secondaryMarketplaces: Array<{
    chainId: number;
    chainName: string;
    dexName: string;
    contractPool: string;
  }>;
  blockchainAddresses: {
    [chain: string]: {
      chainName: string;
      chainId: number;
      contract: string | number;
      distributor: string;
      maintenance?: string;
      rmmPoolAddress?: number;
      rmmV3WrapperAddress?: number;
      chainlinkPriceContract?: number;
    };
  };
  underlyingAssetPrice: number;
  renovationReserve: number | null;
  propertyMaintenanceMonthly: number;
  rentStartDate: {
    date: string;
    timezone_type: number;
    timezone: string;
  };
  lastUpdate: {
    date: string;
    timezone_type: number;
    timezone: string;
  };
  originSecondaryMarketplaces: Array<{
    chainId: number;
    chainName: string;
    dexName: string;
    contractPool: string;
  }>;
  initialLaunchDate: {
    date: string;
    timezone_type: number;
    timezone: string;
  };
  seriesNumber: number;
  constructionYear: number;
  constructionType: string;
  roofType: string;
  assetParking: string | null;
  foundation: string | null;
  heating: string;
  cooling: string | null;
  tokenIdRules: number;
  rentCalculationType: string;
  realtListingFeePercent: number | null;
  realtListingFee: number | null;
  miscellaneousCosts: number | null;
  propertyStories: string | null;
  rentalType: string;
  neighborhood: string;
};

export type RealTokenEvent = {
  date: string; // YYYYMMDD
  values: Record<string, any>;
};

export type RealTokenHistory = {
  uuid: string;
  history: RealTokenEvent[];
};

type RealTokenOptionBag = object; // No options for now

export class DefaultRealTokenAPI implements RealTokenAPI {
  constructor(readonly provider: Provider) {}

  static create(
    apiKey: string | null,
    base: string = REALTOKEN_API_BASEADDRESS,
    options: RealTokenOptionBag = {}
  ) {
    return new DefaultRealTokenAPI(
      new RealTokenProvider(apiKey, base, options)
    );
  }

  token() {
    return this.provider.fetch("/v1/token") as Promise<RealToken[]>;
  }

  tokenByUuid(uuid: string) {
    const url = ["/v1/token", encodeURIComponent(uuid)].join("/");

    return this.provider.fetch(url) as Promise<RealToken>;
  }

  tokenHistory() {
    return this.provider.fetch("/v1/tokenHistory") as Promise<
      RealTokenHistory[]
    >;
  }
}

export type RealTokenAPI = Pick<
  DefaultRealTokenAPI,
  "token" | "tokenByUuid" | "tokenHistory"
>;
