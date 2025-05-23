import { Price } from "./price.mjs";

type PriceMetadata = {
  origin: string;
};

// prettier-ignore
type MetadataFor<T> = 
  T extends Price ? PriceMetadata : 
  never;

type PartialMetadataFor<T> = Partial<MetadataFor<T>>;

/**
 * Registry for storing and retrieving metadata associated with library value objects.
 *
 * XXX Consider merging with CryptoRegistry as they serve similar purposes.
 */
export class MetadataRegistry {
  readonly metadata = new WeakMap<object, object>();

  getMetadata<T extends object>(key: T) {
    return this.metadata.get(key) as PartialMetadataFor<T> | undefined;
  }

  setMetadata<T extends object>(key: T, data: PartialMetadataFor<T>): T {
    let existingMetadata = this.metadata.get(key);
    if (existingMetadata === undefined) {
      this.metadata.set(
        key,
        (existingMetadata = Object.create(null) as PartialMetadataFor<T>)
      );
    }
    Object.assign(existingMetadata, data);

    return key;
  }
}

export const GlobalMetadataRegistry = new MetadataRegistry();
