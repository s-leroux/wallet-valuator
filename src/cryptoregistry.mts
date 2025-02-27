import { DuplicateKeyError, InvalidTreeStructureError } from "./error.mjs";
import { CryptoAsset } from "./cryptoasset.mjs";

export type Metadata = {
  [k: string]: string | number | boolean | null | Metadata; // restricted to JSON-compatible types
};

type StandardNamespace = {
  coingeckoId?: string;
};

export type Namespaces = {
  [k: string]: Metadata | undefined;
  STANDARD?: StandardNamespace;
};

export function deepCopyMetadata(metadata: Metadata): Metadata {
  const seen = new WeakSet<object>();
  const path: string[] = [];

  function copyRecursive(value: Metadata): Metadata {
    if (value === null || typeof value !== "object") {
      return value;
    }

    if (seen.has(value)) {
      throw new InvalidTreeStructureError(path);
    }

    seen.add(value);

    //  // Array are not supported in this version
    //  if (Array.isArray(value)) {
    //    return value.map((item, index) => {
    //      path.push(`[${index}]`);
    //      const result = copyRecursive(item);
    //      path.pop();
    //      return result;
    //    }) as Metadata;
    //  }

    const copy: Metadata = {};
    for (const key of Object.getOwnPropertyNames(metadata)) {
      path.push(key);
      copy[key] = deepCopyMetadata((metadata as Record<string, Metadata>)[key]);
      path.pop();
    }

    // seen.delete(value); // Keep the object in the weak map: DAG are also invalid data structures here

    return copy;
  }

  return copyRecursive(metadata);
}

/**
 * The CryptoRegistry is a cache for the crypto-assets and their associated metadata.
 */
export class CryptoRegistry {
  private cryptos = new Map<string, CryptoAsset>(); // A mapping from physical to logical crypto assets
  private metadatas = new WeakMap<CryptoAsset, Namespaces>(); // Metadata associated with a logical crypto asset

  // Private constructor to enforce factory method use
  private constructor() {}

  /**
   * Factory method to create a new CryptoRegistry instance.
   */
  static create(): CryptoRegistry {
    return new CryptoRegistry();
  }

  /**
   * Register a new crypto-asset with this registry.
   * Raise an error if the key is already registered.
   */
  registerCryptoAsset(
    chainAddress: string,
    crypto: CryptoAsset,
    namespaces: Namespaces | undefined
  ) {
    if (this.cryptos.has(chainAddress)) {
      throw new DuplicateKeyError(chainAddress);
    }
    if (this.metadatas.has(crypto)) {
      throw new DuplicateKeyError(crypto);
    }

    this.cryptos.set(chainAddress, crypto);
    this.metadatas.set(crypto, namespaces ?? Object.create(null));
  }

  getCryptoAsset(chainAddress: string) {
    return this.cryptos.get(chainAddress);
  }

  /**
   * Associate namespace-specific data with a CryptoAsset.
   * @param asset - The CryptoAsset to annotate.
   * @param namespaceName - A well-known namespace identifier for the data.
   * @param namespaceData - The namespace-specific data to associate with the asset.
   */
  setNamespaceData(
    asset: CryptoAsset,
    namespaceName: string,
    namespaceData: Metadata = {}
  ): void {
    let namespace = this.metadatas.get(asset);
    if (namespace === undefined) {
      namespace = {
        // @ts-ignore
        __proto__: null,
      };
      this.metadatas.set(asset, namespace!);
    }

    namespace![namespaceName] = deepCopyMetadata(namespaceData);
  }

  /**
   * Retrieve the data entry for a given CryptoAsset.
   * @param asset - The CryptoAsset to query.
   * @returns The data entry for the asset, or undefined if no data exists.
   */
  getAssetData(asset: CryptoAsset): Namespaces | undefined {
    return this.metadatas.get(asset);
  }

  /**
   * Retrieve namespace-specific data for a CryptoAsset.
   * @param asset - The CryptoAsset to query.
   * @param namespace - The expected namespace for the data.
   * @returns The namespace-specific data, or undefined if no matching entry exists.
   */
  getNamespaceData(
    asset: CryptoAsset,
    namespaceName: string
  ): Metadata | undefined {
    const entry = this.getAssetData(asset);
    return entry?.[namespaceName];
  }
}
