import {
  isJSONObject,
  jsonValueToText,
  Payload,
  Provider,
} from "../../provider.mjs";
import { Swarm } from "../../swarm.mjs";
import { NormalTransaction } from "../../transaction.mjs";
import {
  CommonExplorer,
  TokenTransferRecord,
  InternalTransactionRecord,
  NormalTransactionRecord,
} from "../explorer.mjs";
import { asBlockchain, Blockchain, ChainID } from "../../blockchain.mjs";
import { CryptoRegistryNG } from "../../cryptoregistry.mjs";

const ETHERSCAN_API_BASE_ADDRESS = "https://api.etherscan.io/v2/api";
const ETHERSCAN_DEFAULT_RETRY = Infinity;
const ETHERSCAN_DEFAULT_COOLDOWN = 1000;

//==========================================================================
//  Provider interface
//==========================================================================

export class EtherscanOptionBag {}
/**
 * Handle the idiosyncrasies of the Etherscan API server
 */
export class EtherscanProvider extends Provider {
  readonly origin: string;
  readonly api_key: string;

  constructor(
    api_key: string,
    origin: string = ETHERSCAN_API_BASE_ADDRESS,
    options: EtherscanOptionBag = {},
  ) {
    const defaults = {
      retry: ETHERSCAN_DEFAULT_RETRY,
      cooldown: ETHERSCAN_DEFAULT_COOLDOWN,
    };
    super(origin, Object.assign(defaults, options));
    this.api_key = api_key;
  }

  injectExtraParams(search_params: URLSearchParams) {
    search_params.set("apikey", this.api_key);
  }

  /**
   * Private static helper to determine if the JSON response indicates an error.
   *
   * Etherscan returns HTTP 200 even for error conditions.
   * Instead, errors are indicated by a combination of status set to "0" and a null result.
   * The '__' prefix signals that this method is internal and should not be used directly.
   */
  static __isError(json: Payload): boolean {
    if (json !== null && typeof json === "object" && !Array.isArray(json)) {
      if (json.status === "1" || (json.jsonrpc && json.result !== null))
        return false;

      // Etherscan also return a "0" status for empty results
      if (Array.isArray(json.result) && json.result.length === 0) return false;
    }

    // Everything else is an error
    return true;
  }

  /**
   * Instance method that checks for errors in the response.
   *
   * It delegates first to the base provider's isError() method,
   * and if that returns false, it further checks using the static __isError helper.
   */
  isError(res: Response, json: Payload): boolean {
    return super.isError(res, json) || EtherscanProvider.__isError(json);
  }

  /**
   * Private static helper to determine whether the request should be retried.
   *
   * Etherscan does not use the HTTP 429 status for rate limiting.
   * Instead, rate limiting is indicated by either:
   *   - A payload that is a string (e.g., an HTML error page), or
   *   - An error message in the payload's result that starts with "Max ",
   *     suggesting that the API has been overloaded.
   *
   * The '__' prefix indicates that this helper is meant for internal use only.
   */
  static __shouldRetry(payload: Payload): boolean {
    if (payload === null)
      // internal error: we assume it was a transient issue
      return true;

    if (typeof payload === "string")
      // May return an error page (HTTP 200 with error text when unavailable)
      return true;

    if (Array.isArray(payload))
      // ???
      return false;

    if (
      typeof payload === "object" &&
      typeof payload.result === "string" &&
      payload.result.startsWith("Max ")
    )
      // Indicates API overload conditions
      return true;

    return false;
  }

  /**
   * Instance method to decide whether a request should be retried.
   *
   * It first delegates to the base provider's shouldRetry() logic.
   * If that doesn't trigger a retry, it then checks using the internal __shouldRetry helper.
   * Any errors encountered during the check are logged and rethrown.
   */
  shouldRetry(res: Response, payload: Payload): boolean {
    try {
      return (
        super.shouldRetry(res, payload) ||
        EtherscanProvider.__shouldRetry(payload)
      );
    } catch (err) {
      console.log("An error occurred:", err);
      console.dir(payload);
      throw err;
    }
  }

  newError(res: Response, json: Payload) {
    //    if (res.status !== 200) {
    //      return super.newError(res, json);
    //    }
    let message: string = "";
    let result: string = "";

    if (isJSONObject(json)) {
      message = jsonValueToText(json.message);
      result = jsonValueToText(json.result);
    }

    return new Error(`Error ${message}: ${result} while fetching ${res.url}`);
  }
}

//==========================================================================
//  Domain types
//==========================================================================

export type EtherscanBlockNo = string;

export type EtherscanResponse<T> = {
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
 * Provides an interface to the Etherscan API functions we need.
 */
export class EtherscanAPI {
  readonly provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  static create(
    api_key: string,
    origin: string = ETHERSCAN_API_BASE_ADDRESS,
    options: EtherscanOptionBag = {},
  ) {
    return new EtherscanAPI(new EtherscanProvider(api_key, origin, options));
  }

  async blockNoByTime(
    chainid: string,
    timestamp: number,
    closest: "before" | "after" = "before",
  ) {
    const params = {
      chainid,
      module: "block",
      action: "getblocknobytime",
      timestamp: timestamp,
      closest: closest,
    };

    return (await this.provider.fetch(
      "",
      params,
    )) as EtherscanResponse<EtherscanBlockNo>;
  }

  async normalTransaction(
    chainid: string,
    txhash: string,
  ): Promise<EtherscanResponse<GethTransaction>> {
    const params = {
      chainid,
      module: "proxy",
      action: "eth_getTransactionByHash",
      txhash,
    };

    const response = (await this.provider.fetch(
      "",
      params,
    )) as GethResponse<GethTransaction>;
    const iserror = response.result === null;
    return {
      status: iserror ? "0" : "1",
      message: iserror ? `Error finding normal transaction ${txhash}` : "OK",
      result: response.result!, // XXX This seems a bit forced
    };
  }

  blockInternalTransactions(chainid: string, blockNumber: number) {
    const params = {
      chainid,
      module: "account",
      action: "txlistinternal",
      startBlock: blockNumber,
      endBlock: blockNumber,
      sort: "asc",
    };
    return this.provider.fetch("", params) as Promise<
      EtherscanResponse<InternalTransactionRecord[]>
    >;
  }

  accountNormalTransactions(chainid: string, address: string, block?: number) {
    const params = {
      chainid,
      module: "account",
      action: "txlist",
      startBlock: block ?? 0,
      endBlock: block ?? 99999999,
      sort: "asc",
      address: address,
    };
    return this.provider.fetch("", params) as Promise<
      EtherscanResponse<NormalTransactionRecord[]>
    >;
  }

  accountInternalTransactions(chainid: string, address: string) {
    const params = {
      chainid,
      module: "account",
      action: "txlistinternal",
      startBlock: 0,
      endBlock: 99999999,
      sort: "asc",
      address: address,
    };
    return this.provider.fetch("", params) as Promise<
      EtherscanResponse<InternalTransactionRecord[]>
    >;
  }

  accountTokenTransfers(chainid: string, address: string) {
    const params = {
      chainid,
      module: "account",
      action: "tokentx",
      startBlock: 0,
      endBlock: 99999999,
      sort: "asc",
      address: address,
    };
    return this.provider.fetch("", params) as Promise<
      EtherscanResponse<TokenTransferRecord[]>
    >;
  }
}

//==========================================================================
//  Explorer
//==========================================================================

/**
 * The high-level interface to retrieve transactions.
 * This should probably implement some kind of interface to reduce coupling between the rest
 * of the library and Etherscan. Alternatively, we may also envision caching solutions, or
 * rotating keys.
 *
 * Note: with version 2 (v2) Etherscan is now a generic cross-chain API.
 */
export class Etherscan extends CommonExplorer {
  readonly chainExplorerId: string;
  readonly api: EtherscanAPI;

  constructor(
    registry: CryptoRegistryNG,
    api: EtherscanAPI,
    chain: Blockchain | ChainID | string,
  ) {
    const my_chain = asBlockchain(chain);
    const my_nativeCurrency = registry.createCryptoAsset(
      "xdai",
      "xDai",
      "xDAI",
      18,
    );

    super(my_chain, my_nativeCurrency);
    this.api = api;
    this.chainExplorerId = my_chain.explorerId;
  }

  static create(
    registry: CryptoRegistryNG,
    api_key: string,
    chainid: string,
    origin: string = ETHERSCAN_API_BASE_ADDRESS,
    options: EtherscanOptionBag = {},
  ) {
    return new Etherscan(
      registry,
      EtherscanAPI.create(api_key, origin, options),
      chainid,
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
    txhash: string,
  ): Promise<NormalTransaction> {
    const ethTransaction = (
      await this.api.normalTransaction(this.chainExplorerId, txhash)
    ).result;
    const from = ethTransaction.from;
    // apparently the gnosis aPI does not accept hexadecimal numbers!
    const blockNumber = parseInt(ethTransaction.blockNumber);
    let result;

    const records = (
      await this.api.accountNormalTransactions(
        this.chainExplorerId,
        from,
        blockNumber,
      )
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
      `Transaction ${txhash} was not found in block ${blockNumber}`,
    );
  }

  async blockInternalTransactions(blockNumber: number) {
    return (
      await this.api.blockInternalTransactions(
        this.chainExplorerId,
        blockNumber,
      )
    ).result;
  }

  async accountNormalTransactions(address: string) {
    return (
      await this.api.accountNormalTransactions(this.chainExplorerId, address)
    ).result;
  }

  async accountInternalTransactions(address: string) {
    return (
      await this.api.accountInternalTransactions(this.chainExplorerId, address)
    ).result;
  }

  async accountTokenTransfers(address: string) {
    return (await this.api.accountTokenTransfers(this.chainExplorerId, address))
      .result;
  }
}
