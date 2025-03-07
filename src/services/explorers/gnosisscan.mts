import { Provider } from "../../provider.mjs";
import { Swarm } from "../../swarm.mjs";
import { CryptoAsset } from "../../cryptoasset.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";
import {
  ChainRecord,
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "../../transaction.mjs";
import { CommonExplorer } from "../explorer.mjs";
import { CryptoResolver } from "../cryptoresolver.mjs";
import { asBlockchain, Blockchain } from "../../blockchain.mjs";

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

  injectExtraParams(search_params: URLSearchParams) {
    search_params.set("apiKey", this.api_key);
  }

  isError(res: any, json: any) {
    // GnosisScan returns errors with the 200 status code, but a status set to "0"
    return (
      super.isError(res, json) || json.status === "0" || json.result === null
    );
  }

  shouldRetry(res: any, payload: any) {
    // GnosisScan does not signal rate limiting with a 429 status. We should examine the error message.
    try {
      return (
        super.shouldRetry(res, payload) ||
        typeof payload === "string" || // the server may return an error page (still with status 200)
        payload.result?.startsWith("Max ") // We have overloaded te API
      );
    } catch (err) {
      console.log("An error occured:", err);
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

  async normalTransaction(txhash: string) {
    const params = {
      module: "proxy",
      action: "eth_getTransactionByHash",
      txhash,
    };

    const response = await this.provider.fetch("", params);
    const iserror = response.result === null;
    return {
      status: iserror ? "0" : "1",
      message: iserror ? `Error finding normal transaction ${txhash}` : "OK",
      result: response.result,
    };
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
    return this.provider.fetch("", params);
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
    return this.provider.fetch("", params);
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
    return this.provider.fetch("", params);
  }
}

/**
 * The high-level interface to retrieve transactions.
 * This should probably implement some kind of interface to reduce coupling between the rest
 * of the library and GnosisScan. Alternatively, we may also envision caching solutions, or
 * rotating keys.
 */
export class GnosisScan extends CommonExplorer {
  readonly api: GnosisScanAPI;

  constructor(api: GnosisScanAPI, chain?: Blockchain) {
    const my_chain = chain ?? asBlockchain("gnosis");
    const my_nativeCurrency = new CryptoAsset("xDai", "xDai", "xDai", 18);

    super(my_chain, my_nativeCurrency);
    this.api = api;
  }

  static create(
    api_key: string,
    origin: string = GNOSISSCAN_API_BASE_ADDRESS,
    options = {} as any
  ) {
    return new GnosisScan(GnosisScanAPI.create(api_key, origin, options));
  }

  register(
    swarm: Swarm,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver
  ): void {
    // populate with well-known addresses
    super.register(swarm, registry, cryptoResolver);
    swarm.address(
      this.chain,
      registry,
      cryptoResolver,
      "0x0000000000000000000000000000000000000000",
      {
        name: "Null",
      }
    );
  }

  async getNormalTransactionByHash(
    swarm: Swarm,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
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
      const t = await swarm.normalTransaction(
        this.chain,
        registry,
        cryptoResolver,
        record.hash,
        record
      );
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

  async accountNormalTransactions(
    address: string
  ): Promise<Record<string, any>[]> {
    return (await this.api.accountNormalTransactions(address)).result;
  }

  async accountInternalTransactions(
    address: string
  ): Promise<Record<string, any>[]> {
    return (await this.api.accountInternalTransactions(address)).result;
  }

  async accountTokenTransfers(address: string): Promise<Record<string, any>[]> {
    return (await this.api.accountTokenTransfers(address)).result;
  }
}
