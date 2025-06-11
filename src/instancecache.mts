import { logger } from "./debug.mjs";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const log = logger("instancecache");

/**
 * DeepReadonly utility type.
 * XXX Check if this behaves correctly with arrays?
 */
type DeepReadonly<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends readonly unknown[]
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

type Atom = string | number;

/**
 * Implement object caching to support deduplicated, identity-comparable value-like objects.
 * ⚠️ Objects stored in the cache must be deeply immutable (value objects),
 * meaning they must not be mutated after construction.
 *
 * This constraint ensures consistent behavior, enables GC via WeakRefs,
 * and avoids identity mismatch bugs.
 *
 * @see {MetadataRegistry} for attaching mutable properties to value objects
 */
export class InstanceCache<K extends Atom, Obj extends DeepReadonly<WeakKey>> {
  generation: number = 0;
  /*
   * According to the ECMAScript spec, and clarified in relevant V8 / TC39 discussions:
   *
   * **Atomicity Guarantees:**
   * > Inside a single job (i.e., the execution of a synchronous stack), the GC will not
   * > cause WeakMap entries or WeakRefs to be cleared or inconsistent.
   *
   * So below:
   * If the cache's `weakRef.deref()` returns a non-undefined value inside a given job,
   * then `generationInfo.get(obj)` is guaranteed to return the associated value, if
   * you had put it there and no one deleted it manually.
   */
  readonly generationInfo = new WeakMap<Obj, number>();
  readonly cache = new Map<K, WeakRef<Obj>>();
  readonly finalizers = new FinalizationRegistry<{
    key: K;
    generation: number;
  }>(({ key, generation }) => {
    const cached = this.cache.get(key)?.deref();
    if (cached) {
      if (this.generationInfo.get(cached) === generation) {
        this.cache.delete(key);
        this.generationInfo.delete(cached);
      }
    }
  });

  /**
   * Create a new cache for objects of type `Base` using key of type `K`
   */
  constructor() {}

  /**
   * Retrieves an object from the cache by key, or creates and caches a new instance if none exists.
   *
   * This method ensures that each key maps to a unique object. If an object with the given key
   * already exists in the cache:
   * - And a validation function is provided, the cached object is passed to it.
   * - The validator may throw an error if an inconsistency is detected.
   * - If validation passes (or no validator is provided), the cached object is returned.
   *
   * If no cached object is found, a new one is created using the provided factory function,
   * added to the cache, and returned.
   *
   * Internally, the cache uses `WeakRef` to allow garbage collection of unused objects.
   * When an object is collected, its associated cache entry is automatically cleaned up.
   *
   * @param key - The key to retrieve or create an object for.
   * @param factory - A function to create a new object if none is found in the cache.
   * @param validate - Optional function to check the integrity of cached objects. Can throw to abort if validation fails.
   * @returns The cached or newly created object.
   *
   * @example
   * ```typescript
   * const cache = new InstanceCache<string, MyObject>();
   * const obj = cache.getOrCreate(
   *   "key",
   *   () => new MyObject(),
   *   (cached) => {
   *     if (!cached.isValid()) {
   *       throw new Error("Cached object is invalid");
   *     }
   *   }
   * );
   * ```
   */
  getOrCreate(
    key: K,
    factory: () => Obj,
    validate?: (cached: Obj) => void
  ): Obj {
    const existing = this.cache.get(key)?.deref();
    if (existing) {
      validate?.(existing);
      return existing;
    }

    const obj = factory();
    const generation = ++this.generation;

    this.cache.set(key, new WeakRef(obj));
    this.generationInfo.set(obj, generation);
    this.finalizers.register(obj, { key, generation });

    return obj;
  }
}
