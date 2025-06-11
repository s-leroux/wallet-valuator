/**
 * Registry for storing and retrieving metadata associated with library value objects.
 *
 * ISSUE #122 Consider merging with CryptoRegistry as they serve similar purposes.
 */
export class MetadataStore {
  readonly metadata = new WeakMap<object, object>();

  getMetadata<T extends object, M extends object>(key: T): Partial<M> {
    const existing = this.metadata.get(key);
    if (existing) {
      return existing;
    }
    const empty = Object.create(null) as Partial<M>;
    this.metadata.set(key, empty);
    return empty;
  }

  setMetadata<T extends object, M extends object>(key: T, data: Partial<M>): T {
    let existing = this.metadata.get(key);
    if (existing === undefined) {
      this.metadata.set(key, (existing = Object.create(null) as Partial<M>));
    }
    Object.assign(existing, data);

    return key;
  }
}

export const GlobalMetadataStore = new MetadataStore();

export class MetadataFacade<T extends object, M extends object> {
  constructor(private readonly store: MetadataStore) {}

  static create<
    T extends object,
    M extends object,
    Self extends MetadataFacade<T, M>
  >(
    this: new (store: MetadataStore) => Self,
    store: MetadataStore = GlobalMetadataStore
  ): Self {
    return new this(store);
  }

  getMetadata<N extends M = M>(key: T): Partial<N> {
    return this.store.getMetadata(key);
  }

  setMetadata<N extends M = M>(key: T, data: Partial<N>): T {
    return this.store.setMetadata(key, data);
  }
}
