import { DuplicateKeyError, Logged, ValueError } from "./error.mjs";
import { CryptoAssetID, CryptoAsset, toCryptoAssetID } from "./cryptoasset.mjs";
import { logger } from "./debug.mjs";
const log = logger("crypto-registry");

type WellKnownCryptoAssets = {
  [key: string]: [name: string, symbol: string, decimal: number] | undefined;
};

const wellKnownCryptoAssets: WellKnownCryptoAssets = {
  bitcoin: ["Bitcoin", "BTC", 18],
} as const;

export type Metadata = {
  [k: string]: string | number | boolean | null; // restricted to JSON-compatible primitive types
};

type StandardMetadata = {
  coingeckoId?: string;
  resolver?: string;
};

export type Namespaces = {
  [k: string]: Metadata | undefined;
  STANDARD?: StandardMetadata;
};

/**
 * The CryptoRegistry is a cache for the crypto-assets and their associated metadata.
 */
export class CryptoRegistry {
  private readonly cryptoAssets = new Map<CryptoAssetID, CryptoAsset>(); // A mapping from crypto-asset id to logical crypto assets
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
    return this.cryptoAssets.get(toCryptoAssetID(id));
  }

  /**
   * Find or create a `CryptoAsset` in the registry.
   *
   * Crypto-assets are uniquely identified by their `id`. The `id` is a free-form lowercase string
   * that uniquely identifies a crypto-asset. The application code is responsible for
   * attribution and ensuring uniqueness of the `id`.
   *
   * If you specify _only_ the `id`, the function will asssume you reference a
   * well-known crypto-asset (eg: `bitcoin`, `ethereum`, ...)
   *
   * @param id - The unique identifier for the crypto-asset
   * @param name - The human-readable name of the crypto-asset
   * @param symbol - The symbol used to represent the crypto-asset
   * @param decimal - The number of decimal places used for the crypto-asset
   * @returns The existing or newly created CryptoAsset
   */
  // prettier-ignore
  findCryptoAsset(id: string): CryptoAsset;
  // prettier-ignore
  findCryptoAsset(id: string, name: string, symbol: string, decimal: number ): CryptoAsset;
  findCryptoAsset(
    id: string,
    name?: string,
    symbol?: string,
    decimal?: number
  ) {
    if (name === undefined || symbol === undefined || decimal === undefined) {
      // One argument form
      const wellKnownAsset = wellKnownCryptoAssets[id];
      if (!wellKnownAsset) {
        throw Logged(
          "C3006",
          ValueError,
          `${id} is not a well-known crypto-asset`
        );
      }
      [name, symbol, decimal] = wellKnownAsset;
    }
    return CryptoAsset.create(this.cryptoAssets, id, name, symbol, decimal);
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
   * Associate (upsert) namespace-specific data with a CryptoAsset.
   * If the namespace doesn't exist, it will be created. If it exists,
   * the new data will be merged with the existing data.
   * @param asset - The CryptoAsset to annotate.
   * @param namespaceName - A well-known namespace identifier for the data.
   * @param namespaceData - The namespace-specific data to associate with the asset.
   */
  setNamespaceData(
    asset: CryptoAsset,
    namespaceName: string,
    namespaceData: Metadata = Object.create(null)
  ): void {
    let namespaces = this.namespaces.get(asset);
    if (namespaces === undefined) {
      namespaces = {
        __proto__: null,

        [namespaceName]: Object.assign(Object.create(null), namespaceData),
      };
      this.namespaces.set(asset, namespaces);
      return;
    }

    namespaces[namespaceName] = Object.assign(
      namespaces[namespaceName] ?? Object.create(null),
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
    namespaceName: "STANDARD"
  ): StandardMetadata | undefined;
  getNamespaceData(
    asset: CryptoAsset,
    namespaceName: string
  ): Metadata | undefined;
  getNamespaceData(
    asset: CryptoAsset,
    namespaceName: string
  ): Metadata | undefined {
    const entry = this.getNamespaces(asset);
    return entry?.[namespaceName];
  }
}
