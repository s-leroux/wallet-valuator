import { InvalidTreeStructureError } from "./error.mjs";
import type { CryptoAsset } from "./cryptoasset.mjs";

type Metadata = {
  [key: string]: string | number | boolean | null | Metadata; // restricted to JSON-compatible types
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

type CryptoAssetData = {
  domain: string; // A well-known domain identifier
  data: Metadata; // Metadata related to the asset in this domain
};

export class CryptoRegistry {
  private registry = new WeakMap<CryptoAsset, CryptoAssetData>();

  // Private constructor to enforce singleton-like behavior
  private constructor() {}

  /**
   * Associate domain-specific data with a CryptoAsset.
   * @param asset - The CryptoAsset to annotate.
   * @param domain - A well-known domain identifier for the data.
   * @param data - The domain-specific data to associate with the asset.
   */
  setDomainData(asset: CryptoAsset, domain: string, data: Metadata = {}): void {
    this.registry.set(asset, { domain, data: deepCopyMetadata(data) });
  }

  /**
   * Retrieve the data entry for a given CryptoAsset.
   * @param asset - The CryptoAsset to query.
   * @returns The data entry for the asset, or undefined if no data exists.
   */
  getAssetData(asset: CryptoAsset): CryptoAssetData | undefined {
    return this.registry.get(asset);
  }

  /**
   * Retrieve domain-specific data for a CryptoAsset, if it matches the provided domain.
   * @param asset - The CryptoAsset to query.
   * @param domain - The expected domain for the data.
   * @returns The domain-specific data, or undefined if no matching entry exists.
   */
  getDomainData(asset: CryptoAsset, domain: string): Metadata | undefined {
    const entry = this.getAssetData(asset);
    if (entry && entry.domain === domain) {
      return entry.data;
    }
    return undefined;
  }

  /**
   * Factory method to create a new CryptoRegistry instance.
   */
  static create(): CryptoRegistry {
    return new CryptoRegistry();
  }
}
