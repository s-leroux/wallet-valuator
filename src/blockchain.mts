import { MMap } from "./memoizer.mjs";

export function asBlockchain(chain: Blockchain | string): Blockchain {
  if (typeof chain === "string") {
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
        "__testResetRegistry should only be used in test environments!"
      );
    }
    this.registry.clear();
  }
}
