// Sentinel value to explicitly store `undefined` in the cache.
const UNDEFINED = Symbol("undefined");

/**
 * A generic key-value cache with optional lazy value computation.
 *
 * This class extends JavaScript’s `Map<K, V>` with an optional value resolver and
 * explicit handling of `undefined` values using a sentinel value.
 */
export class MMap<K, V> {
  private cache: Map<K, V | typeof UNDEFINED>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Retrieves a value from the cache or computes it using the optional factory function.
   *
   * - If the key exists, the stored value is returned.
   * - If the key does not exist and a factory function is provided, the value is computed, stored, and returned.
   * - If the key does not exist and no factory function is provided, `undefined` is returned.
   *
   * @param key - The lookup key.
   * @param factory - An optional function to compute a value if the key is missing.
   * @returns The cached or computed value, or `undefined` if the key is missing and no factory is provided.
   */
  get<F extends (() => V) | undefined>(
    key: K,
    factory?: F
  ): F extends () => V ? V : V | undefined {
    const value = this.cache.get(key); // Single lookup

    if (value !== undefined) {
      return value === UNDEFINED ? (undefined as V) : value;
    }

    if (!factory) {
      return undefined as any;
    }
    return this.set(key, factory());
  }

  /**
   * Manually stores a value in the cache.
   *
   * - If `undefined` is assigned, it is replaced by the sentinel value `UNDEFINED`
   *   to differentiate it from a missing key.
   *
   * @param key - The key under which the value is stored.
   * @param value - The value to associate with the key.
   * @returns The original value passed as input.
   */
  set(key: K, value: V): V {
    this.cache.set(key, value === undefined ? UNDEFINED : value);
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
