import { AssertionError } from "./error.mjs";
import { logger } from "./debug.mjs";
import { Ensure } from "./type.mjs";

const log = logger("memoizer");

/**
 * A generic key-value cache with optional lazy value computation.
 *
 * This class extends JavaScript's `Map<K, V>` with an optional value resolver and
 * explicit handling of `undefined` values using a sentinel value.
 */
export class MMap<K, V> {
  private cache: Map<K, V>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Retrieves a value from the cache or computes it using the optional factory function.
   *
   * - If the key exists, the stored value is returned.
   * - If the key does not exist and a factory function is provided, the value is computed, stored, and returned.
   * - If the key does not exist and no factory function is provided, an exception is raised.
   *
   * @param key - The lookup key.
   * @param factory - An optional function to compute a value if the key is missing.
   * @returns The cached or computed value.
   */
  get<F extends () => V>(key: K, factory?: F): V {
    const value = this.cache.get(key); // Single lookup

    if (value !== undefined) {
      return value;
    }

    if (!factory) {
      const error = new AssertionError(
        "Key not found and no factory function provided. Either provide a factory function to compute the value or ensure the key exists."
      );
      log.error("C3014", error);
      throw error;
    }
    return this.set(key, factory());
  }

  /**
   * Manually stores a value in the cache.
   *
   * Storing `undefined` in the cache is explicitly forbidden. If you need to store the
   * absence of values, you should use `null` instead.
   *
   * @param key - The key under which the value is stored.
   * @param value - The value to associate with the key.
   * @returns The original value passed as input.
   */
  set(key: K, value: V): V {
    Ensure.isDefined(value);

    this.cache.set(key, value);
    return value;
  }

  /**
   * Removes a specific key from the cache.
   *
   * @param key - The key to remove.
   * @returns `true` if the key was found and removed, `false` otherwise.
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clears all stored key-value pairs from the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Checks whether a key exists in the cache.
   *
   * @param key - The key to check.
   * @returns `true` if the key exists, `false` otherwise.
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }
}
