import {
  DuplicateKeyError,
  InconsistentUnitsError,
  InvalidTreeStructureError,
} from "./error.mjs";
import { CryptoAsset } from "./cryptoasset.mjs";
import { logger } from "./debug.mjs";
const log = logger("crypto-registry");

export type Metadata = {
  [k: string]: string | number | boolean | null; // restricted to JSON-compatible types
};

type StandardNamespace = {
  coingeckoId?: string;
};

export type Namespaces = {
  [k: string]: Metadata | undefined;
  STANDARD?: StandardNamespace;
};

/**
 * The CryptoRegistry is a cache for the crypto-assets and their associated metadata.
 */
export class CryptoRegistry {
  private readonly cryptoAssets = new Map<string, CryptoAsset>(); // A mapping from crypto-asset id to logical crypto assets
  private readonly namespaces = new WeakMap<CryptoAsset, Namespaces>(); // Metadata associated with a logical crypto asset

  // Private constructor to enforce factory method use
  private constructor() {}

  /**
   * Factory method to create a new CryptoRegistry instance.
   */
  static create(): CryptoRegistry {
    return new CryptoRegistry();
  }

  getCryptoAsset(id: string) {
    return this.cryptoAssets.get(id);
  }

  findCryptoAsset(id: string, name: string, symbol: string, decimal: number) {
    const existing = this.cryptoAssets.get(id);
    if (existing) {
      // consistency check
      if (name !== existing.name || symbol !== existing.symbol) {
        log.warn(
          "C2003",
          `existing ${name} ${symbol} different from ${existing.name} ${existing.symbol}`
        );
      }
      if (decimal !== existing.decimal) {
        log.error(
          "C3003",
          `existing precision ${decimal} different from ${existing.decimal} for ${name}`
        );
        throw new InconsistentUnitsError(decimal, existing.decimal);
      }

      return existing;
    }

    const crypto = new CryptoAsset(id, name, symbol, decimal);
    this.cryptoAssets.set(id, crypto);

    return crypto;
  }

  /**
   * Register a pre-existing crypto-asset with optional metadata
   */
  registerCryptoAsset(asset: CryptoAsset, namespaces?: Namespaces) {
    if (this.cryptoAssets.has(asset.id)) {
      log.error("C3004", `Crypto-asset ${asset} already registered`);
      throw new DuplicateKeyError(asset);
    }

    this.cryptoAssets.set(asset.id, asset);
    if (namespaces) {
      this.setNamespaces(asset, namespaces);
    }
  }

  setNamespaces(asset: CryptoAsset, namespaces: Namespaces) {
    for (const [key, value] of Object.entries(namespaces)) {
      this.setNamespaceData(asset, key, value);
    }
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
    namespaceData: Metadata = Object.create(null)
  ): void {
    let namespace = this.namespaces.get(asset);
    if (namespace === undefined) {
      namespace = {
        // @ts-ignore
        __proto__: null,

        [namespaceName]: Object.assign(Object.create(null), namespaceData),
      };
      this.namespaces.set(asset, namespace);
    }

    namespace[namespaceName] = Object.assign(
      namespace[namespaceName] ?? Object.create(null),
      namespaceData
    );
  }

  /**
   * Retrieve the data entry for a given CryptoAsset.
   * @param asset - The CryptoAsset to query.
   * @returns The data entry for the asset, or undefined if no data exists.
   */
  getNamespaces(asset: CryptoAsset): Namespaces | undefined {
    return this.namespaces.get(asset);
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
    const entry = this.getNamespaces(asset);
    return entry?.[namespaceName];
  }
}
