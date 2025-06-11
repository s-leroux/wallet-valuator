import { ValueError } from "./error.mjs";
import { Logged } from "./errorutils.mjs";
import { CryptoAssetID, CryptoAsset } from "./cryptoasset.mjs";
import { logger } from "./debug.mjs";
import { WellKnownCryptoAssets } from "./wellknowncryptoassets.mjs";
import { ChainAddress, mangleChainAddress } from "./chainaddress.mjs";
import { InstanceCache } from "./instancecache.mjs";
import { MetadataFacade } from "./metadata.mjs";

const log = logger("crypto-registry");

//======================================================================
//  CryptoMetadata
//======================================================================

export type MetadataOld = {
  [k: string]: string | number | boolean | null; // restricted to JSON-compatible primitive types
};

export interface CryptoAssetMetadata {
  fiscalCategory?: CryptoAssetFiscalCategory;
  coingeckoId?: string;
  resolver: string;
}

export class CryptoMetadata extends MetadataFacade<
  CryptoAsset,
  CryptoAssetMetadata
> {}

//======================================================================
//  CryptoRegistry
//======================================================================

type RegisteredCryptoAssets = {
  [key: string]: [name: string, symbol: string, decimal: number] | undefined;
};

const registeredCryptoAssets: RegisteredCryptoAssets =
  WellKnownCryptoAssets.reduce((acc, [id, name, symbol, decimal]) => {
    acc[id] = [name, symbol, decimal];
    return acc;
  }, {} as RegisteredCryptoAssets);

type CryptoAssetFiscalCategory = undefined | "SECURITY" | "UTILITY TOKEN";

export class CryptoRegistryNG {
  private readonly cache: InstanceCache<CryptoAssetID, CryptoAsset>;

  private constructor() {
    this.cache = new InstanceCache();
  }

  static create() {
    return new this();
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
  createCryptoAsset(id: string | ChainAddress): CryptoAsset;
  // prettier-ignore
  createCryptoAsset(id: string | ChainAddress, name: string, symbol: string, decimal: number ): CryptoAsset;
  createCryptoAsset(
    id: string | ChainAddress,
    name?: string,
    symbol?: string,
    decimal?: number
  ) {
    if (typeof id !== "string") {
      id = mangleChainAddress(id);
    }

    if (name === undefined || symbol === undefined || decimal === undefined) {
      // One argument form
      const wellKnownAsset = registeredCryptoAssets[id];
      if (!wellKnownAsset) {
        throw Logged(
          "C3006",
          ValueError,
          `${id} is not a well-known crypto-asset`
        );
      }
      [name, symbol, decimal] = wellKnownAsset;
    }

    // CryptoAsset.create will internally call our `registerCryptoAsset` method
    return CryptoAsset.create(this.cache, id, name, symbol, decimal);
  }

  registerCryptoAsset(cryptoAsset: CryptoAsset) {
    this.cache.getOrCreate(
      cryptoAsset.id,
      () => cryptoAsset,
      (existing) => {
        const error = new ValueError(`${existing} already registered`);
        log.error("C3016", error, cryptoAsset);
        throw error;
      }
    );
  }
}
