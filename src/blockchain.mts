import { DisplayOptions } from "./displayable.mjs";
import { ValueError } from "./error.mjs";
import { MMap } from "./memoizer.mjs";

/**
 * Branded type for blockchain chain IDs.
 * Chain IDs are numeric identifiers for blockchains (e.g., "1" for Ethereum, "100" for Gnosis Chain).
 * This ensures type safety when working with chain IDs.
 */
export type ChainID = string & { readonly brand: unique symbol };

/**
 * Validates and converts a value to a ChainID.
 * The chain ID must be a string containing only digits (0-9).
 *
 * @param chainId - The chain ID to validate (string or number)
 * @returns A validated ChainID
 * @throws ValueError if the chain ID is invalid (empty, contains non-digits, or negative)
 * @example
 * const ethereumChainId = asChainID("1");
 * const gnosisChainId = asChainID(100); // Accepts numbers
 */
export function asChainID(chainId: string | number | ChainID): ChainID {
  const chainIdStr = typeof chainId === "number" ? String(chainId) : chainId;

  // Validate that it's not empty
  if (!chainIdStr || chainIdStr.length === 0) {
    throw new ValueError("Chain ID cannot be empty");
  }

  // Validate that it contains only digits
  if (!/^\d+$/.test(chainIdStr)) {
    throw new ValueError(
      `Chain ID must contain only digits: "${chainIdStr}" is invalid`,
    );
  }

  // Ensure no leading zeros (except for "0" itself)
  if (chainIdStr.length > 1 && chainIdStr[0] === "0") {
    throw new ValueError(
      `Chain ID cannot have leading zeros: "${chainIdStr}" is invalid`,
    );
  }

  return chainIdStr as ChainID;
}

export function asBlockchain(chain: Blockchain | ChainID | string): Blockchain {
  if (typeof chain === "string") {
    if ((chain as string) !== "gnosis")
      throw new Error(`Unsupported chain: ${chain}`); // Only the Gnosis chain is supported.
    return Blockchain.create(chain);
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
  private static registry = new MMap<string, Blockchain>();

  private constructor(public readonly name: string) {}

  static create(name: string) {
    return this.registry.get(name.toLowerCase(), () => new Blockchain(name));
  }

  toString() {
    return this.name;
  }

  toDisplayString(options: DisplayOptions) {
    return this.name;
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
