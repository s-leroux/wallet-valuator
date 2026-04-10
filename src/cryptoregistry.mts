import { ValueError } from "./error.mjs";
import { Logged } from "./errorutils.mjs";
import { CryptoAsset, CryptoAssetCache } from "./cryptoasset.mjs";
import { logger } from "./debug.mjs";
import {
  WellKnownCryptoAsset,
  WellKnownCryptoAssets,
} from "./data/wellknowncryptoassets.mjs";
import { ChainAddress, mangleChainAddress } from "./chainaddress.mjs";
import { MetadataFacade } from "./metadata.mjs";

const log = logger("crypto-registry");

//======================================================================
//  CryptoMetadata
//======================================================================

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
//  Preload the table of well-known crypto-assets
//======================================================================

type RegisteredCryptoAssets = {
  [key: string]: WellKnownCryptoAsset | undefined;
};

// create an index of the well-known crypto-assets
const registeredCryptoAssets: RegisteredCryptoAssets =
  WellKnownCryptoAssets.reduce(
    (acc, row) => {
      acc[row[0]] = row;
      return acc;
    },
    Object.create(null) as RegisteredCryptoAssets,
  );

//======================================================================
//  CryptoRegistry
//======================================================================

export type CryptoAssetDescriptor = {
  id: string | ChainAddress;
  name: string;
  symbol: string;
  decimal: number;
};

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
   * Find or create a **logical** `CryptoAsset` in this registry’s cache.
   *
   * Crypto-assets are uniquely identified by their `id`. The `id` is either:
   * - a free-form lowercase string that uniquely identifies a (well-known)logical crypto-asset, or
   * - a {@link ChainAddress} that uniquely identifies an orphan (unknown)physical crypto-asset.
   *
   * The application code is responsible for attribution and ensuring uniqueness of the well-known id.
   * When the id is a {@link ChainAddress}, it is mangled into a string id (e.g. `"ethereum:0xa0b8…"`)
   * that uniquely identifies a the singleton logical asset for an otherwise-unrecognised on-chain.
   *
   * See {@link CryptoAsset} for the equivalence-class semantics.
   *
   * **Call shapes**
   *
   * - **Well-known id only** — `createCryptoAsset("bitcoin")` loads fixed
   *   `(name, symbol, decimal)` from the built-in well-known table, then calls
   *   {@link CryptoAsset.create}. If the id is missing from that table, throws
   *   `ValueError` (logged `C3006`).
   * - **Explicit metadata** — `createCryptoAsset(id, name, symbol, decimal)`
   *   skips the well-known table and passes the fields straight to
   *   {@link CryptoAsset.create}. Use this for chain-specific or resolver-defined
   *   assets (the id may be a mangled {@link ChainAddress}).
   *
   * **Create vs reuse**
   *
   * {@link CryptoAsset.create} uses the registry cache’s `getOrCreate`: the first
   * request for a given normalized id constructs and stores a `CryptoAsset`;
   * later calls with the same id return the **same** instance until it is
   * collected and evicted from the weak cache.
   *
   * Prefer {@link findCryptoAsset} when you want the name to reflect
   * “lookup” semantics; it is equivalent to this method.
   *
   * @param id - The internal identifier for the crypto-asset, or a `ChainAddress`
   *   for orphan tokens.
   * @param name - The human-readable name of the crypto-asset.
   * @param symbol - The symbol used to represent the crypto-asset.
   * @param decimal - The number of decimal places used for the crypto-asset.
   * @returns The cached or newly created `CryptoAsset`.
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
      [, name, symbol, decimal] = wellKnownAsset;
    }

    return CryptoAsset.create(this.cache, id, name, symbol, decimal);
  }

  /**
   * Same behavior as {@link createCryptoAsset}. Use this name when the intent is
   * “obtain the registry’s singleton for this id,” matching
   * {@link CryptoAsset.create} documentation.
   */
  findCryptoAsset(internalId: string | ChainAddress): CryptoAsset {
    return this.createCryptoAsset(internalId);
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
