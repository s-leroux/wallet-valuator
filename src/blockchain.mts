import { DisplayOptions } from "./displayable.mjs";
import { ValueError } from "./error.mjs";
import { MMap } from "./memoizer.mjs";

import { Logged } from "./errorutils.mjs";

/**
 * An internal blockchain identifier.
 *
 * It is an unique name to identify a blockchain internally in the library.
 * We try to keep this identifier as close as possible to the identifier used by well-known
 * data providers (e.g. CoinGecko), but there is no guarantee.
 *
 * This is the key used by {@link Blockchain.find} and {@link Blockchain.create}.
 */
export type BlockchainInternalID = string & { readonly brand: unique symbol };

export function asBlockchainInternalID(
  id: string | BlockchainInternalID,
): BlockchainInternalID {
  const idStr = id.trim().toLowerCase();

  // Validate that it's not empty
  if (!idStr) {
    throw Logged("C3103", ValueError, "Blockchain ID cannot be empty");
  }

  return idStr as BlockchainInternalID;
}

type Redirect = {
  comment?: string;
  type: "redirect";
  redirect: BlockchainInternalID;
};

type EVMRecord = {
  comment?: string;
  type: "evm";
  "display-name": string;
  "explorer-name": string;
  "explorer-options": {
    chainid: number; // The EIP-155 chain ID, practically capped at uint53
  };
};

type BinanceRecord = {
  comment?: string;
  type: "binance";
  "display-name": string;
  "explorer-options"?: undefined;
};

type BitcoinRecord = {
  comment?: string;
  type: "bitcoin";
  "display-name": string;
  "explorer-options"?: undefined;
};

type SolanaRecord = {
  comment?: string;
  type: "solana";
  "display-name": string;
  "explorer-options"?: undefined;
};

type XRPLedgerRecord = {
  comment?: string;
  type: "xrp-ledger";
  "display-name": string;
  "explorer-options"?: undefined;
};

type BlockchainType = "evm" | "binance" | "bitcoin" | "solana" | "xrp-ledger";
export type BlockchainRecord =
  | BinanceRecord
  | EVMRecord
  | BitcoinRecord
  | SolanaRecord
  | XRPLedgerRecord;

type BlockchainData = Readonly<
  Record<
    BlockchainInternalID,
    Readonly<BlockchainRecord> | Readonly<Redirect> | undefined
  >
>;

//======================================================================
//  Blockchain class and related types
//======================================================================

import rawBlockchainData from "./data/blockchains.json" with { type: "json" };

const blockchainData: BlockchainData =
  rawBlockchainData satisfies BlockchainData;

/**
 * Anything that can be converted to a {@link Blockchain} instance.
 */
export type BlockchainSource = Blockchain | BlockchainInternalID | string;

/**
 * Converts a {@link BlockchainSource} to a {@link Blockchain} instance.
 */
export function asBlockchain(chain: BlockchainSource): Blockchain {
  if (typeof chain === "string") {
    return Blockchain.find(asBlockchainInternalID(chain));
  }

  return chain;
}

/**
 * Class Blockchain
 *
 * Blockchain instances are cached in an internal registry and are value-comparable using `===`.
 * Blockchain instances and their underlying data are considered immutable.
 *
 * You can find a well-known blockchain by its internal identifier using the {@link Blockchain.find}
 * method or, better, by using the {@link asBlockchain} function.
 * You can create a new blockchain instance using the {@link Blockchain.create} method.
 *
 * This class is mostly a wrapper around the blockchain data records.
 * Contributors are encouraged to keep this class loosely coupled with higher-level classes.
 * A good rule of thumb is "May I implement it if data comes from an RDBMS?"
 *
 */
export class Blockchain {
  private static registry = new MMap<BlockchainInternalID, Blockchain>();

  //--------------------------------------------------------------------
  //  Constructor and factory methods
  //--------------------------------------------------------------------

  private constructor(
    // Our internal blockchain identifier (e.g. "ethereum")
    // **not** the EIP-155 chain ID (e.g. "1"). We may operate non-EVM blockchains.
    public readonly id: BlockchainInternalID,
    public readonly chainRecord: BlockchainRecord,
  ) {}

  static create(
    id: BlockchainInternalID,
    chainRecord: BlockchainRecord,
  ): Blockchain {
    // FIXME: If found, we should check consistency between the "old" record and `chainRecord`
    return this.registry.get(id, () => {
      // FIXME: We assume chainRecord is deeply immutable.
      return new Blockchain(id, chainRecord);
    });
  }

  static find(id: BlockchainInternalID | string): Blockchain {
    const internalBlockchainID = asBlockchainInternalID(id);
    const blockchain = this.registry.get(internalBlockchainID, () => {
      const chainData = blockchainData[internalBlockchainID]; // Lookup in the well-known registry

      if (!chainData) {
        throw Logged(
          "C3100",
          ValueError,
          `Chain not found: ${internalBlockchainID}`,
        );
      }

      if (chainData.type === "redirect") {
        return this.find(chainData.redirect);
      }

      return Blockchain.create(internalBlockchainID, chainData);
    });

    return blockchain;
  }

  //--------------------------------------------------------------------
  //  Properties
  //--------------------------------------------------------------------

  get displayName(): string {
    return this.chainRecord["display-name"] ?? this.id;
  }

  get explorerName(): string | undefined {
    const chainType = this.chainRecord.type;
    switch (chainType) {
      case "evm":
        return this.chainRecord["explorer-name"];
      case "binance":
      case "bitcoin":
      case "solana":
      case "xrp-ledger":
        return undefined;
      default:
        throw Logged(
          "C3102",
          ValueError,
          `Unknown blockchain type: ${chainType}`,
        );
    }
  }

  get type(): BlockchainType {
    return this.chainRecord.type;
  }

  //--------------------------------------------------------------------
  // Polymorphic explorer options
  //--------------------------------------------------------------------

  getEVMExplorerOptions(): Readonly<EVMRecord["explorer-options"]> {
    if (this.type === "evm")
      return (this.chainRecord as EVMRecord)["explorer-options"];

    throw Logged(
      "C3104",
      ValueError,
      `Blockchain ${this.id} is not an EVM blockchain`,
    );
  }

  getBinanceExplorerOptions(): Readonly<BinanceRecord["explorer-options"]> {
    if (this.type === "binance")
      return (this.chainRecord as BinanceRecord)["explorer-options"];

    throw Logged(
      "C3105",
      ValueError,
      `Blockchain ${this.id} is not a Binance CEX`,
    );
  }

  getBitcoinExplorerOptions(): Readonly<BitcoinRecord["explorer-options"]> {
    if (this.type === "bitcoin")
      return (this.chainRecord as BitcoinRecord)["explorer-options"];

    throw Logged(
      "C3106",
      ValueError,
      `Blockchain ${this.id} is not a Bitcoin blockchain`,
    );
  }

  getSolanaExplorerOptions(): Readonly<SolanaRecord["explorer-options"]> {
    if (this.type === "solana")
      return (this.chainRecord as SolanaRecord)["explorer-options"];

    throw Logged(
      "C3107",
      ValueError,
      `Blockchain ${this.id} is not a Solana blockchain`,
    );
  }

  getXRPLedgerExplorerOptions(): Readonly<XRPLedgerRecord["explorer-options"]> {
    if (this.type === "xrp-ledger")
      return (this.chainRecord as XRPLedgerRecord)["explorer-options"];

    throw Logged(
      "C3108",
      ValueError,
      `Blockchain ${this.id} is not an XRPLedger blockchain`,
    );
  }

  //--------------------------------------------------------------------
  //  String conversion
  //--------------------------------------------------------------------

  toString(): string {
    return this.id;
  }

  toDisplayString(options: DisplayOptions) {
    return this.displayName;
  }

  //--------------------------------------------------------------------
  //  For testing purposes only
  //--------------------------------------------------------------------

  /**
   * Resets the singleton registry for unit testing purposes.
   *
   * This method clears the internal registry of blockchain instances,
   * ensuring that tests run in isolation without interference from previous test cases.
   *
   * 🚨 **Important:** This method should only be used in test environments.
   * If called outside of `NODE_ENV === "test"`, it will throw an error to prevent accidental misuse.
   *
   * **Usage in Tests:**
   * ```ts
   * beforeEach(() => {
   *   (Blockchain as any).__testResetRegistry();
   * });
   * ```
   */
  static __testResetRegistry(): void {
    if (process.env.NODE_ENV !== "test") {
      throw new Error(
        "__testResetRegistry should only be used in test environments!",
      );
    }
    this.registry.clear();
  }
}
