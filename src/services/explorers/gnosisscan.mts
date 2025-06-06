import { Provider } from "../../provider.mjs";
import { Swarm } from "../../swarm.mjs";
import { NormalTransaction } from "../../transaction.mjs";
import {
  CommonExplorer,
  TokenTransferRecord,
  InternalTransactionRecord,
  NormalTransactionRecord,
} from "../explorer.mjs";
import { asBlockchain, Blockchain } from "../../blockchain.mjs";
import { CryptoRegistry } from "../../cryptoregistry.mjs";

const GNOSISSCAN_API_BASE_ADDRESS = "https://api.gnosisscan.io/api";
const GNOSISSCAN_DEFAULT_RETRY = Infinity;
const GNOSISSCAN_DEFAULT_COOLDOWN = 1000;

//==========================================================================
//  Provider interface
//==========================================================================

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

  injectExtraParams(search_params: URLSearchParams) {
    search_params.set("apiKey", this.api_key);
  }

  /**
   * Private static helper to determine if the JSON response indicates an error.
   *
   * GnosisScan returns HTTP 200 even for error conditions.
   * Instead, errors are indicated by a combination of status set to "0" and a null result.
   * The '__' prefix signals that this method is internal and should not be used directly.
   */
  static __isError(json: any): boolean {
    if (json.status === "1" || (json.jsonrpc && json.result !== null))
      return false;

    // GnosisScan also return a "0" status for empty results
    if (Array.isArray(json.result) && json.result.length === 0) return false;

    // Everything else is an error
    return true;
  }

  /**
   * Instance method that checks for errors in the response.
   *
   * It delegates first to the base provider's isError() method,
   * and if that returns false, it further checks using the static __isError helper.
   */
  isError(res: any, json: any): boolean {
    return super.isError(res, json) || GnosisScanProvider.__isError(json);
  }

  /**
   * Private static helper to determine whether the request should be retried.
   *
   * GnosisScan does not use the HTTP 429 status for rate limiting.
   * Instead, rate limiting is indicated by either:
   *   - A payload that is a string (e.g., an HTML error page), or
   *   - An error message in the payload's result that starts with "Max ",
   *     suggesting that the API has been overloaded.
   *
   * The '__' prefix indicates that this helper is meant for internal use only.
   */
  static __shouldRetry(payload: any): boolean {
    return (
      typeof payload === "string" || // May return an error page (HTTP 200 with error text when unavailable
      (typeof payload.result === "string" && payload.result.startsWith("Max ")) // Indicates API overload conditions
    );
  }

  /**
   * Instance method to decide whether a request should be retried.
   *
   * It first delegates to the base provider's shouldRetry() logic.
   * If that doesn't trigger a retry, it then checks using the internal __shouldRetry helper.
   * Any errors encountered during the check are logged and rethrown.
   */
  shouldRetry(res: any, payload: any): boolean {
    try {
      return (
        super.shouldRetry(res, payload) ||
        GnosisScanProvider.__shouldRetry(payload)
      );
    } catch (err) {
      console.log("An error occurred:", err);
      console.dir(payload);
      throw err;
    }
  }

  newError(res: any, json: any) {
    //    if (res.status !== 200) {
    //      return super.newError(res, json);
    //    }
    return new Error(
      `Error ${json.message ?? ""}: ${json.result} while fetching ${res.url}`
    );
  }
}

//==========================================================================
//  Domain types
//==========================================================================

export type GnosisScanBlockNo = string;

export type GnosisScanResponse<T> = {
  result: T;
  status: string;
  message: string;
};

type JSONRpcVersion = "2.0";

export type GethResponse<T> = {
  jsonrpc: JSONRpcVersion;
  result: T | null;
  id: number;
};

export type GethTransaction = {
  hash: string;
  nonce: string;
  blockHash: string;
  blockNumber: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  maxPriorityFeePerGas: string;
  maxFeePerGas: string;
  gas: string;
  data: string;
  input: string;
  chainId: string;
  type: string;
  v: string;
  s: string;
  r: string;
  yParity: string;
};

//==========================================================================
//  API
//==========================================================================

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

    return (await this.provider.fetch(
      "",
      params
    )) as GnosisScanResponse<GnosisScanBlockNo>;
  }

  async normalTransaction(
    txhash: string
  ): Promise<GnosisScanResponse<GethTransaction>> {
    const params = {
      module: "proxy",
      action: "eth_getTransactionByHash",
      txhash,
    };

    const response = (await this.provider.fetch(
      "",
      params
    )) as GethResponse<GethTransaction>;
    const iserror = response.result === null;
    return {
      status: iserror ? "0" : "1",
      message: iserror ? `Error finding normal transaction ${txhash}` : "OK",
      result: response.result!, // XXX This seems a bit forced
    };
  }

  blockInternalTransactions(blockNumber: number) {
    const params = {
      module: "account",
      action: "txlistinternal",
      startBlock: blockNumber,
      endBlock: blockNumber,
      sort: "asc",
    };
    return this.provider.fetch("", params) as Promise<
      GnosisScanResponse<InternalTransactionRecord[]>
    >;
  }

  accountNormalTransactions(address: string, block?: number) {
    const params = {
      module: "account",
      action: "txlist",
      startBlock: block ?? 0,
      endBlock: block ?? 99999999,
      sort: "asc",
      address: address,
    };
    return this.provider.fetch("", params) as Promise<
      GnosisScanResponse<NormalTransactionRecord[]>
    >;
  }

  accountInternalTransactions(address: string) {
    const params = {
      module: "account",
      action: "txlistinternal",
      startBlock: 0,
      endBlock: 99999999,
      sort: "asc",
      address: address,
    };
    return this.provider.fetch("", params) as Promise<
      GnosisScanResponse<InternalTransactionRecord[]>
    >;
  }

  accountTokenTransfers(address: string) {
    const params = {
      module: "account",
      action: "tokentx",
      startBlock: 0,
      endBlock: 99999999,
      sort: "asc",
      address: address,
    };
    return this.provider.fetch("", params) as Promise<
      GnosisScanResponse<TokenTransferRecord[]>
    >;
  }
}

//==========================================================================
//  Explorer
//==========================================================================

/**
 * The high-level interface to retrieve transactions.
 * This should probably implement some kind of interface to reduce coupling between the rest
 * of the library and GnosisScan. Alternatively, we may also envision caching solutions, or
 * rotating keys.
 */
export class GnosisScan extends CommonExplorer {
  readonly api: GnosisScanAPI;

  constructor(
    registry: CryptoRegistry,
    api: GnosisScanAPI,
    chain?: Blockchain
  ) {
    const my_chain = chain ?? asBlockchain("gnosis");
    const my_nativeCurrency = registry.createCryptoAsset(
      "xdai",
      "xDai",
      "xDAI",
      18
    );

    super(my_chain, my_nativeCurrency);
    this.api = api;
  }

  static create(
    registry: CryptoRegistry,
    api_key: string,
    origin: string = GNOSISSCAN_API_BASE_ADDRESS,
    options = {} as any
  ) {
    return new GnosisScan(
      registry,
      GnosisScanAPI.create(api_key, origin, options)
    );
  }

  /**
   * Pre-populate a `Swarm` instance with well-known data for the blockchain associated with this explorer.
   */
  register(swarm: Swarm): void {
    // populate with well-known addresses
    super.register(swarm);
    /*
    // The following lines are probably obsolete since native currencies have to be created from the crypto-registry.
    swarm.registry.registerCryptoAsset(this.nativeCurrency, {
      STANDARD: {
        coingeckoId: "xdai",
      },
    });
    */
    swarm.address(this.chain, "0x0000000000000000000000000000000000000000", {
      name: "Null",
    });
  }

  async getNormalTransactionByHash(
    swarm: Swarm,
    txhash: string
  ): Promise<NormalTransaction> {
    const ethTransaction = (await this.api.normalTransaction(txhash)).result;
    const from = ethTransaction.from;
    // apparently the gnosis aPI does not accept hexadecimal numbers!
    const blockNumber = parseInt(ethTransaction.blockNumber);
    let result;

    const records = (
      await this.api.accountNormalTransactions(from, blockNumber)
    ).result;

    for (const record of records) {
      const t = await swarm.normalTransaction(this.chain, record.hash, record);
      if (t.hash.toLowerCase() === txhash.toLowerCase()) {
        result = t;
      }
    }
    if (result) {
      return result;
    }
    console.dir(ethTransaction);
    throw new Error(
      `Transaction ${txhash} was not found in block ${blockNumber}`
    );
  }

  async blockInternalTransactions(blockNumber: number) {
    return (await this.api.blockInternalTransactions(blockNumber)).result;
  }

  async accountNormalTransactions(address: string) {
    return (await this.api.accountNormalTransactions(address)).result;
  }

  async accountInternalTransactions(address: string) {
    return (await this.api.accountInternalTransactions(address)).result;
  }

  async accountTokenTransfers(address: string) {
    return (await this.api.accountTokenTransfers(address)).result;
  }
}
