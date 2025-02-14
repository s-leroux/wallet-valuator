import { DuplicateKeyError, InvalidTreeStructureError } from "./error.mjs";
import type { CryptoAsset } from "./cryptoasset.mjs";

export type Metadata = {
  [k: string]: string | number | boolean | null | Metadata; // restricted to JSON-compatible types
};

type StandardDomain = {
  coingeckoId?: string;
};

export type Domains = {
  [k: string]: Metadata | undefined;
  STANDARD?: StandardDomain;
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
  private cryptos = new Map<string, CryptoAsset>();
  private registry = new WeakMap<CryptoAsset, Domains>();

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
    key: string,
    crypto: CryptoAsset,
    domains: Domains | undefined
  ) {
    if (this.cryptos.has(key)) {
      throw new DuplicateKeyError(key);
    }
    if (this.registry.has(crypto)) {
      throw new DuplicateKeyError(crypto);
    }

    this.cryptos.set(key, crypto);
    this.registry.set(crypto, domains ?? Object.create(null));
  }

  getCryptoAsset(key: string) {
    return this.cryptos.get(key);
  }

  /**
   * Associate domain-specific data with a CryptoAsset.
   * @param asset - The CryptoAsset to annotate.
   * @param domainName - A well-known domain identifier for the data.
   * @param domainData - The domain-specific data to associate with the asset.
   */
  setDomainData(
    asset: CryptoAsset,
    domainName: string,
    domainData: Metadata = {}
  ): void {
    let domain = this.registry.get(asset);
    if (domain === undefined) {
      domain = {
        // @ts-ignore
        __proto__: null,
      };
      this.registry.set(asset, domain!);
    }

    domain![domainName] = deepCopyMetadata(domainData);
  }

  /**
   * Retrieve the data entry for a given CryptoAsset.
   * @param asset - The CryptoAsset to query.
   * @returns The data entry for the asset, or undefined if no data exists.
   */
  getAssetData(asset: CryptoAsset): Domains | undefined {
    return this.registry.get(asset);
  }

  /**
   * Retrieve domain-specific data for a CryptoAsset, if it matches the provided domain.
   * @param asset - The CryptoAsset to query.
   * @param domain - The expected domain for the data.
   * @returns The domain-specific data, or undefined if no matching entry exists.
   */
  getDomainData(asset: CryptoAsset, domainName: string): Metadata | undefined {
    const entry = this.getAssetData(asset);
    return entry?.[domainName];
  }
}
