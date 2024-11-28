import { Provider } from "../../provider.mjs";
import { Swarm } from "../../swarm.mjs";
import { Ledger } from "../../ledger.mjs";
import {
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "../../transaction.mjs";
import { Explorer } from "../explorer.mjs";

const GNOSISSCAN_API_BASE_ADDRESS = "https://api.gnosisscan.io/api";
const GNOSISSCAN_DEFAULT_RETRY = Infinity;
const GNOSISSCAN_DEFAULT_COOLDOWN = 1000;

const GNOSIS_NATIVE_COIN_DECIMALS = 18;

/**
 * Handle the idiosyncrasies of the GnosisScan API server
 */
export class GnosisScanProvider extends Provider {
  readonly origin: string;
  readonly api_key: string;

  constructor(
    api_key: string,
    origin: string = GNOSISSCAN_API_BASE_ADDRESS,
    options = {} as any
  ) {
    const defaults = {
      retry: GNOSISSCAN_DEFAULT_RETRY,
      cooldown: GNOSISSCAN_DEFAULT_COOLDOWN,
    };
    super(origin, Object.assign(defaults, options));
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

  newError(res, json: any) {
    //    if (res.status !== 200) {
    //      return super.newError(res, json);
    //    }
    return new Error(
      `Error ${json.message}: ${json.result} while fetching ${res.url}`
    );
  }
}

/**
 * Provides an interface to the GnosisScan API functions we need.
 */
export class GnosisScanAPI {
  readonly provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  static create(
    api_key: string,
    origin: string = GNOSISSCAN_API_BASE_ADDRESS,
    options = {} as any
  ) {
    return new GnosisScanAPI(new GnosisScanProvider(api_key, origin, options));
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

/**
 * The high-level interface to retrieve transactions.
 * This should probably implement some kind of interface to reduce coupling between the rest
 * of the library and GnosisScan. Alternatively, we may also envision caching solutions, or
 * rotating keys.
 */
export class GnosisScan extends Explorer {
  readonly api: GnosisScanAPI;

  constructor(api: GnosisScanAPI, chain: string = "gnosis") {
    super(chain);
    this.api = api;
  }

  static create(
    api_key: string,
    origin: string = GNOSISSCAN_API_BASE_ADDRESS,
    options = {} as any
  ) {
    return new GnosisScan(GnosisScanAPI.create(api_key, origin, options));
  }

  register(swarm: Swarm): void {
    // populate with well-known addresses
    super.register(swarm);
    swarm.address(this.chain, "0x0000000000000000000000000000000000000000", {
      name: "Null",
    });
  }
  async addressNormalTransactions(swarm: Swarm, address: string) {
    const res = await this.api.accountNormalTransactions(address);

    return Ledger.create(
      res.result
        .filter((tr) => tr.isError === "0")
        .map((t) => swarm.transaction(NormalTransaction, this.chain, t.hash, t))
    );
  }

  async addressInternalTransactions(swarm: Swarm, address: string) {
    const res = await this.api.accountInternalTransactions(address);

    return Ledger.create(
      res.result
        .filter((tr) => tr.isError === "0")
        .map((t) =>
          swarm.transaction(InternalTransaction, this.chain, t.hash, t)
        )
    );
  }

  async addressTokenTransfers(swarm: Swarm, address: string) {
    const res = await this.api.accountTokenTransfers(address);

    return Ledger.create(
      res.result.map((t) =>
        swarm.transaction(ERC20TokenTransfer, this.chain, t.hash, t)
      )
    );
  }

  async addressAllTransfers(swarm: Swarm, address: string) {
    /*
     * Merge {normal, internal, token} transfers in one single list ordered by timestamp.
     */

    // naive implementation
    const [normal, internal, erc20] = await Promise.all([
      this.addressNormalTransactions(swarm, address),
      this.addressInternalTransactions(swarm, address),
      this.addressTokenTransfers(swarm, address),
    ]);

    return Ledger.create(normal).union(internal).union(erc20);
  }
}
