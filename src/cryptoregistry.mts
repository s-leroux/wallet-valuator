import { ValueError } from "./error.mjs";
import { Logged } from "./errorutils.mjs";
import { CryptoAsset, CryptoAssetCache } from "./cryptoasset.mjs";
import { logger } from "./debug.mjs";
import { WellKnownCryptoAssets } from "./data/wellknowncryptoassets.mjs";
import { ChainAddress, mangleChainAddress } from "./chainaddress.mjs";
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
  private readonly cache: CryptoAssetCache;

  private constructor() {
    this.cache = CryptoAssetCache();
  }

  static create() {
    return new this();
  }

  /**
   * Find or create a **logical** `CryptoAsset` in the registry.
   *
   * Crypto-assets are uniquely identified by their `id`. The `id` is a free-form
   * lowercase string that uniquely identifies a logical crypto-asset. The
   * application code is responsible for attribution and ensuring uniqueness of the
   * `id`.
   *
   * The `id` parameter also accepts a {@link ChainAddress}. In that case, the
   * chain-address is mangled into a string id (e.g. `"ethereum:0xa0b8…"`). This
   * is used by catch-all resolvers (such as `LazyCryptoResolver`) to create a
   * singleton logical asset for an otherwise-unrecognised on-chain token. See
   * {@link CryptoAsset} for the equivalence-class semantics.
   *
   * If you specify _only_ the `id`, the function will assume you reference a
   * well-known crypto-asset (e.g. `bitcoin`, `ethereum`, …).
   *
   * @param id - The internal identifier for the crypto-asset, or a `ChainAddress`
   *   for orphan tokens.
   * @param name - The human-readable name of the crypto-asset.
   * @param symbol - The symbol used to represent the crypto-asset.
   * @param decimal - The number of decimal places used for the crypto-asset.
   * @returns The existing or newly created CryptoAsset.
   */
  // prettier-ignore
  createCryptoAsset(id: string | ChainAddress): CryptoAsset;
  // prettier-ignore
  createCryptoAsset(id: string | ChainAddress, name: string, symbol: string, decimal: number ): CryptoAsset;
  createCryptoAsset(
    id: string | ChainAddress,
    name?: string,
    symbol?: string,
    decimal?: number,
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
          `${id} is not a well-known crypto-asset`,
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
      },
    );
  }
}
