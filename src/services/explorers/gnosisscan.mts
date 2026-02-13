import {
  EtherscanAPI,
  Etherscan,
  EtherscanResponse,
  EtherscanBlockNo,
  GethResponse,
  GethTransaction,
  EtherscanOptionBag,
  EtherscanProvider,
} from "./etherscan.mjs";
import { Provider } from "../../provider.mjs";
import { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import { Blockchain, ChainID } from "../../blockchain.mjs";

const GNOSIS_CHAIN_NAME = "gnosis";
const GNOSIS_CHAIN_EXPLORER_ID = "100";
const GNOSISSCAN_API_BASE_ADDRESS = "https://api.etherscan.io/v2/api";

// Re-export types as aliases
export type GnosisScanBlockNo = EtherscanBlockNo;
export type GnosisScanResponse<T> = EtherscanResponse<T>;
export type { GethResponse, GethTransaction };

export const GnosisScanProvider = EtherscanProvider;
export type GnosisScanProvider = Provider;

//==========================================================================
//  API
//==========================================================================

/**
 * Provides an interface to the GnosisScan API functions we need.
 *
 * Note: This wraps EtherscanAPI with chainid "100" for Gnosis chain,
 * providing backward-compatible method signatures.
 */
export class GnosisScanAPI {
  readonly provider: Provider;
  private readonly api: EtherscanAPI;

  constructor(provider: Provider) {
    this.provider = provider;
    this.api = new EtherscanAPI(provider);
  }

  static create(
    api_key: string,
    origin: string = GNOSISSCAN_API_BASE_ADDRESS,
    options = {} as EtherscanOptionBag,
  ) {
    return new GnosisScanAPI(new EtherscanProvider(api_key, origin, options));
  }

  async blockNoByTime(
    timestamp: number,
    closest: "before" | "after" = "before",
  ) {
    return this.api.blockNoByTime(GNOSIS_CHAIN_EXPLORER_ID, timestamp, closest);
  }

  async normalTransaction(
    txhash: string,
  ): Promise<GnosisScanResponse<GethTransaction>> {
    return this.api.normalTransaction(GNOSIS_CHAIN_EXPLORER_ID, txhash);
  }

  blockInternalTransactions(blockNumber: number) {
    return this.api.blockInternalTransactions(
      GNOSIS_CHAIN_EXPLORER_ID,
      blockNumber,
    );
  }

  accountNormalTransactions(address: string, block?: number) {
    return this.api.accountNormalTransactions(
      GNOSIS_CHAIN_EXPLORER_ID,
      address,
      block,
    );
  }

  accountInternalTransactions(address: string) {
    return this.api.accountInternalTransactions(
      GNOSIS_CHAIN_EXPLORER_ID,
      address,
    );
  }

  accountTokenTransfers(address: string) {
    return this.api.accountTokenTransfers(GNOSIS_CHAIN_EXPLORER_ID, address);
  }
}

//==========================================================================
//  Explorer
//==========================================================================

/**
 * The high-level interface to retrieve transactions for Gnosis chain.
 *
 * Note: This extends Etherscan with chainid "100". GnosisScan is now powered
 * by Etherscan v2 multi-chain API.
 */
export class GnosisScan extends Etherscan {
  constructor(registry: CryptoRegistryNG, api: GnosisScanAPI) {
    // Create an EtherscanAPI from the provider for the parent class
    const etherscanAPI = new EtherscanAPI(api.provider);
    super(registry, etherscanAPI, GNOSIS_CHAIN_NAME);
  }

  static create(
    registry: CryptoRegistryNG,
    api_key: string,
    origin: string = GNOSISSCAN_API_BASE_ADDRESS,
    options = {} as EtherscanOptionBag,
  ) {
    const api = GnosisScanAPI.create(api_key, origin, options);
    return new GnosisScan(registry, api);
  }
}
