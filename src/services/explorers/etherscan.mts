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
import {
  asBlockchain,
  Blockchain,
  BlockchainSource,
} from "../../blockchain.mjs";
import { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import { WellKnownBlockchains } from "../../data/wellknownblockchains.mjs";

/**
 * @module
 * The word "Etherscan" is a bit overloaded here. Originally Etherscan was a specific
 * blockchain explorer for Ethereum. The Etherscan team provided support for other chains
 * through a similar API but at a different base URL.
 *
 * With Etherscan v2, the API is now a generic cross-chain API. All chains date are accessed
 * through the same API endpoint, but with the extra parameter `chainid` to identify the chain.
 *
 * When this file was originally written, the Etherscan v2 API was not yet available. So the
 * `EtherscanAPI` class was used to access the Ethereum-dedicated blockchain API. Independently
 *  we also had the `GnosisScanAPI` class to access the Gnosis-dedicated blockchain API.
 *
 * Nowadays, the `EtherscanAPI` class is used to access the generic cross-chain API.
 *
 * The `EtherscanBoundAPI` class is used to bind the generic cross-chain API to a specific chain
 * like Ethereum or Gnosis.
 *
 * @see https://docs.etherscan.io/api-endpoints/accounts
 */

//==========================================================================
//  Constants
//==========================================================================

const ETHERSCAN_API_BASE_ADDRESS = "https://api.etherscan.io/v2/api";
const ETHERSCAN_DEFAULT_RETRY = Infinity;
const ETHERSCAN_DEFAULT_COOLDOWN = 1000;

//==========================================================================
//  Provider interface
//==========================================================================

export type EtherscanOptionBag = {
  cooldown?: number;
  retry?: number;
  baseAddress?: string;
};

/**
 * Etherscan-specific `Provider` behavior for API key injection, retry logic,
 * and response/error normalization.
 */
export class EtherscanProvider extends Provider {
  readonly api_key: string;

  constructor(api_key: string, options: EtherscanOptionBag = {}) {
    const opts = Object.assign(
      {
        retry: ETHERSCAN_DEFAULT_RETRY,
        cooldown: ETHERSCAN_DEFAULT_COOLDOWN,
        baseAddress: ETHERSCAN_API_BASE_ADDRESS,
      },
      options,
    );

    super(opts.baseAddress, opts);
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
 *
 * There is a 1:1 relationship between EtherscanAPI methods and the API endpoints provided by Etherscan
 * (same parameters, same return types).
 *
 * In particular, we pass the chainid as a parameter to the methods, since it is required by the API.
 * Being blockchain-agnostic, the same EtherscanAPI instance can be used for multiple chains.
 *
 * By itself, the EtherscanAPI class is stateless. But the attached provider may be stateful.
 * We should clarify that before considering a singleton implementation.
 */
export class EtherscanAPI {
  constructor(readonly provider: Provider) {}

  /**
   * Creates a new EtherscanAPI instance.
   *
   * @param api_key - The API key to use for the Etherscan API.
   * @param options - The options for the Etherscan API.
   * @returns A new EtherscanAPI instance.
   */
  static create(api_key: string, options: EtherscanOptionBag = {}) {
    return new EtherscanAPI(new EtherscanProvider(api_key, options));
  }

  async blockNoByTime(
    eid: number,
    timestamp: number,
    closest: "before" | "after" = "before",
  ) {
    const params = {
      chainid: String(eid),
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
    eid: number,
    txhash: string,
  ): Promise<EtherscanResponse<GethTransaction>> {
    const params = {
      chainid: String(eid),
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
      result: response.result!, // ISSUE #215: This seems a bit forced
    };
  }

  blockInternalTransactions(eid: number, blockNumber: number) {
    const params = {
      chainid: String(eid),
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

  accountNormalTransactions(eid: number, address: string, block?: number) {
    const params = {
      chainid: String(eid),
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

  accountInternalTransactions(eid: number, address: string) {
    const params = {
      chainid: String(eid),
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

  accountTokenTransfers(eid: number, address: string) {
    const params = {
      chainid: String(eid),
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

/**
 * As the Etherscan v2 API is now a generic cross-chain API, we will define a chain-specific
 * bound API interface.
 */
export class DefaultEtherscanBoundAPI {
  private readonly eid: number; // The EIP-155 chain ID **not** our internal blockchain identifier
  private readonly delegate: EtherscanAPI;

  constructor(eid: number, delegate: EtherscanAPI) {
    this.eid = eid;
    this.delegate = delegate;
  }

  static forChain(
    chain: Blockchain,
    api_key: string,
    options: EtherscanOptionBag = {},
  ) {
    const eid = chain.getEVMExplorerOptions().chainid;
    const api = EtherscanAPI.create(api_key, options);
    return new DefaultEtherscanBoundAPI(eid, api);
  }

  async blockNoByTime(
    timestamp: number,
    closest: "before" | "after" = "before",
  ) {
    return this.delegate.blockNoByTime(this.eid, timestamp, closest);
  }

  async normalTransaction(txhash: string) {
    return this.delegate.normalTransaction(this.eid, txhash);
  }

  blockInternalTransactions(blockNumber: number) {
    return this.delegate.blockInternalTransactions(this.eid, blockNumber);
  }

  accountNormalTransactions(address: string, block?: number) {
    return this.delegate.accountNormalTransactions(this.eid, address, block);
  }

  accountInternalTransactions(address: string) {
    return this.delegate.accountInternalTransactions(this.eid, address);
  }

  accountTokenTransfers(address: string) {
    return this.delegate.accountTokenTransfers(this.eid, address);
  }
}

export type EtherscanBoundAPI = Pick<
  DefaultEtherscanBoundAPI,
  | "blockNoByTime"
  | "normalTransaction"
  | "blockInternalTransactions"
  | "accountNormalTransactions"
  | "accountInternalTransactions"
  | "accountTokenTransfers"
>;

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
  readonly api: EtherscanBoundAPI;
  readonly eid: number; // The EIP-155 chain ID **not** our internal blockchain identifier

  constructor(
    registry: CryptoRegistryNG,
    chain: Blockchain,
    api: EtherscanBoundAPI,
  ) {
    const explorerOptions = chain.getEVMExplorerOptions();
    const eid = explorerOptions.chainid;

    const myNativeCurrency = registry.createCryptoAsset(
      // ISSUE #216: This is chain-specific!
      "xdai",
      "xDai",
      "xDAI",
      18,
    );

    super(chain, myNativeCurrency);
    this.api = api;
    this.eid = eid;
  }

  static create(
    registry: CryptoRegistryNG,
    chain: BlockchainSource,
    api_key: string,
    options = {} as EtherscanOptionBag,
  ) {
    chain = asBlockchain(chain);

    const api = DefaultEtherscanBoundAPI.forChain(chain, api_key, options);
    return new Etherscan(registry, asBlockchain(chain), api);
  }

  /**
   * Pre-populate a `Swarm` instance with well-known data for the blockchain associated with this explorer.
   */
  register(swarm: Swarm): void {
    // populate with well-known addresses
    super.register(swarm);
    /*
    // Legacy native-currency registration. Native assets are created from the crypto-registry now,
    // so this is likely unused; kept for reference.
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
      `Transaction ${txhash} was not found in block ${blockNumber}`,
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

export const ExplorerFactories = (() => {
  const result: Record<
    string,
    {
      create: (
        registry: CryptoRegistryNG,
        api_key: string,
        options?: EtherscanOptionBag,
      ) => Etherscan;
    }
  > = {};
  for (const [internalId, chain] of Object.entries(WellKnownBlockchains)) {
    const blockchain = Blockchain.find(internalId);
    if (blockchain.type === "evm") {
      result[internalId] = {
        create(
          registry: CryptoRegistryNG,
          api_key: string,
          options = {} as EtherscanOptionBag,
        ) {
          return Etherscan.create(registry, blockchain, api_key, options);
        },
      };
    }
  }
  return result;
})();

// ISSUE #217: Remove this dead code
const legacy = {
  ethereum: {
    create(
      registry: CryptoRegistryNG,
      api_key: string,
      options = {} as EtherscanOptionBag,
    ) {
      return Etherscan.create(registry, "1", api_key, options);
    },
  },
  gnosis: {
    create(
      registry: CryptoRegistryNG,
      api_key: string,
      options = {} as EtherscanOptionBag,
    ) {
      return Etherscan.create(registry, "100", api_key, options);
    },
    base: {
      create(
        registry: CryptoRegistryNG,
        api_key: string,
        options = {} as EtherscanOptionBag,
      ) {
        return Etherscan.create(registry, "8453", api_key, options);
      },
    },
    arbitrum: {
      create(
        registry: CryptoRegistryNG,
        api_key: string,
        options = {} as EtherscanOptionBag,
      ) {
        return Etherscan.create(registry, "42161", api_key, options);
      },
    },
    bnb: {
      create(
        registry: CryptoRegistryNG,
        api_key: string,
        options = {} as EtherscanOptionBag,
      ) {
        return Etherscan.create(registry, "56", api_key, options);
      },
    },
  },
};
