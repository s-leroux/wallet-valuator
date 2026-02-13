import { DisplayOptions } from "./displayable.mjs";
import { ValueError } from "./error.mjs";
import { MMap } from "./memoizer.mjs";

import { Logged } from "./errorutils.mjs";

type BlockchainDataRecord = {
  "display-name": string;
  "explorer-id": string;
};

type BlockchainData = Readonly<
  Record<ChainID, Readonly<BlockchainDataRecord> | undefined>
>;
import rawBlockchainData from "./data/blockchains.json" with { type: "json" };

const blockchainData: BlockchainData = rawBlockchainData;

/**
 * Branded type for blockchain chain IDs.
 * This ensures type safety when working with chain IDs.
 */
export type ChainID = string & { readonly brand: unique symbol };

/**
 * Validates and converts a value to a ChainID.
 *
 * @param chainId - The chain ID to validate (string or number)
 * @returns A validated ChainID
 * @throws ValueError if the chain ID is invalid
 * @example
 * const ethereumChainId = asChainID("1");
 * const gnosisChainId = asChainID(100); // Accepts numbers
 */
export function asChainID(chainId: string | ChainID): ChainID {
  const chainIdStr = chainId.trim().toLowerCase();

  // Validate that it's not empty
  if (!chainIdStr) {
    throw new ValueError("Chain ID cannot be empty");
  }

  return chainIdStr as ChainID;
}

export function asBlockchain(chain: Blockchain | ChainID | string): Blockchain {
  if (typeof chain === "string") {
    return Blockchain.find(chain);
  }

  return chain;
}

/**
 * Class Blockchain
 *
 * Represents a blockchain identifier, **not** a full conceptual model of a blockchain.
 *
 * This class is designed primarily as a **unique identifier** for different blockchains.
 * It is **not** intended to encapsulate blockchain-specific logic, transaction handling,
 * or native currency management. Instead, it serves as a lightweight, registry-backed
 * key that can be used for lookups, comparisons, and mappings.
 *
 * ## Key Characteristics:
 * - **Immutable & Lightweight:** A `Blockchain` instance only holds a string name.
 * - **Singleton-like Behavior:** Instances are cached and retrieved via `Blockchain.create(name)`.
 * - **Ensures Consistency:** Prevents duplicate instances for the same blockchain name.
 * - **Optimized for Lookups:** Can be used as a key in `Map<Blockchain, ...>`.
 *
 * ## Important Notes:
 * - The native currency of a blockchain is **not** stored in this class. Instead, `Explorer`
 *   or other components should manage blockchain-specific details.
 * - `Blockchain` should be treated as a **reference** or **label**, similar to an enum value.
 */
export class Blockchain {
  private static registry = new MMap<ChainID, Blockchain>();

  private constructor(
    public readonly id: ChainID,
    public readonly chainRecord: BlockchainDataRecord,
  ) {}

  /** Display name of the blockchain (e.g. "ethereum", "gnosis"). */
  get name(): string {
    return this.id;
  }

  get displayName(): string {
    return this.chainRecord["display-name"];
  }

  /** Explorer ID of the blockchain (e.g. "1", "100" for Ethereum-like chains). */
  get explorerId(): string {
    return this.chainRecord["explorer-id"];
  }

  static create(id: ChainID, chainRecord: BlockchainDataRecord): Blockchain {
    // FIXME: If found, we do not check consistency between the "old" record and `chainRecord`
    return this.registry.get(id, () => {
      // FIXME: We assume chainRecord is deeply immutable.
      return new Blockchain(id, chainRecord);
    });
  }

  static find(id: ChainID | string): Blockchain {
    const chainId = asChainID(id);
    return this.registry.get(chainId, () => {
      const chainData = blockchainData[chainId]; // Lookup in the well-known registry

      if (!chainData) {
        throw Logged("C3100", ValueError, `Chain not found: ${chainId}`);
      }
      return Blockchain.create(chainId, chainData);
    });
  }

  toString() {
    return this.name;
  }

  toDisplayString(options: DisplayOptions) {
    return this.displayName;
  }

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
  private static __testResetRegistry(): void {
    if (process.env.NODE_ENV !== "test") {
      throw new Error(
        "__testResetRegistry should only be used in test environments!",
      );
    }
    this.registry.clear();
  }
}
