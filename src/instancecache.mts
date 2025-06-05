import { logger } from "./debug.mjs";
import { AssertionError } from "./error.mjs";

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

export interface ValueWithKey<K> {
  readonly key: K;
}

type Atom = string | number;

/**
 * Implement object caching to support deduplicated, identity-comparable value-like objects based on a unique key.
 * *
 * ⚠️ Objects stored in the cache must be deeply immutable (value objects),
 * meaning they must not be mutated after construction.
 *
 * This constraint ensures consistent behavior, enables GC via WeakRefs,
 * and avoids identity mismatch bugs.
 *
 * @see {MetadataRegistry} for attaching mutable properties to value objects
 */

export class InstanceCache<
  K extends Atom,
  Obj extends WeakKey & DeepReadonly<ValueWithKey<K>>
> {
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
   * Get the object in the cache with the given key, potentially creating
   * a new instance if not yet cached.
   *
   * Assumptions/Pre-requisites:
   * - All cached objects implement ValueWithKey<K>
   * - For any object obj created by `ctor`, `obj.key === key`
   *   or,otherwise written, `new ctor(...).key === key`
   *
   * Note: If multiple distinct objects are registered under the same key,
   * and their lifetime overlaps the behavior is unspecified and we will
   * no longuer garantee that value objects are identity comparable.
   */
  getOrCreate<P extends unknown[]>(
    key: K,
    ctor: new (...args: P) => Obj,
    ...args: P
  ): Obj {
    const existing = this.cache.get(key)?.deref();
    if (existing) {
      return existing;
    }

    const obj = new ctor(...args);

    if (obj.key !== key) {
      // We have an inconsistency here
      const err = new AssertionError(
        `Factory returned object with key ${obj.key} but expected ${key}`
      );
      log.error("C3013", err.message);
      throw err;
    }
    const generation = ++this.generation;

    this.cache.set(key, new WeakRef(obj));
    this.generationInfo.set(obj, generation);
    this.finalizers.register(obj, { key, generation });

    return obj;
  }
}
