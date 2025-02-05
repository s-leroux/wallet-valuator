import { MMap } from "./memoizer.mjs";

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
