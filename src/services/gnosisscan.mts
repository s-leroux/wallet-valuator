import { Provider } from "../provider.mjs";

const GNOSISSCAN_BASE_ADDRESS = "https://api.gnosisscan.io/api";
const GNOSISSCAN_DEFAULT_RETRY = Infinity;
const GNOSISSCAN_DEFAULT_COOLDOWN = 1000;

const GNOSIS_NATIVE_COIN_DECIMALS = 18;

export class GnosisScanProvider extends Provider {
  readonly origin: string;
  readonly api_key: string;

  constructor(
    api_key: string,
    origin: string = GNOSISSCAN_BASE_ADDRESS,
    options = {} as any
  ) {
    const defaults = {
      retry: GNOSISSCAN_DEFAULT_RETRY,
      cooldown: GNOSISSCAN_DEFAULT_COOLDOWN,
    };
    super(GNOSISSCAN_BASE_ADDRESS, Object.assign(defaults, options));
    this.api_key = api_key;
  }

  injectExtraParams(search_params) {
    search_params.set("apiKey", this.api_key);
  }

  isError(res, json: any) {
    // GnosisScan returns errors with the 200 status code, but a status set to "0"
    return super.isError(res, json) || json.status === "0";
  }

  shouldRetry(res, json: any) {
    // GnosisScan does not signal rate limiting with a 429 status. We should examine the error message.
    return super.shouldRetry(res, json) || json.result.startsWith("Max ");
  }
}

export class GnosisScan {
  readonly provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  static create(
    api_key: string,
    origin: string = GNOSISSCAN_BASE_ADDRESS,
    options = {} as any
  ) {
    return new GnosisScan(new GnosisScanProvider(api_key, origin, options));
  }

  async blockNoByTime(
    timestamp: number,
    closest: "before" | "after" = "before"
  ) {
    const params = {
      module: "block",
      action: "getblocknobytime",
      timestamp: timestamp,
      closest: closest,
    };

    return await this.provider.fetch("", params);
  }

  async accountNormalTransactions(address: string) {
    const params = {
      module: "account",
      action: "txlist",
      startBlock: 0,
      endBlock: 99999999,
      sort: "asc",
      address: address,
    };
    return await this.provider.fetch("", params);
  }

  async accountInternalTransactions(address: string) {
    const params = {
      module: "account",
      action: "txlistinternal",
      startBlock: 0,
      endBlock: 99999999,
      sort: "asc",
      address: address,
    };
    return await this.provider.fetch("", params);
  }

  async accountTokenTransfers(address: string) {
    const params = {
      module: "account",
      action: "tokentx",
      startBlock: 0,
      endBlock: 99999999,
      sort: "asc",
      address: address,
    };
    return await this.provider.fetch("", params);
  }
}
