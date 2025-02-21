import { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoResolver, ResolutionResult } from "../cryptoresolver.mjs";
import type { CryptoRegistry, Domains } from "../../cryptoregistry.mjs";

import { MMap } from "../../memoizer.mjs";
import { Blockchain } from "../../blockchain.mjs";
import { InternalError } from "../../error.mjs";

// XXX We may factor out the ChainAddress utility
type ChainAddress = string & { readonly brand: unique symbol };
function ChainAddress(
  chain: string,
  smartContractAddress: string | null
): ChainAddress {
  return `${chain}:${smartContractAddress || ""}`.toLowerCase() as ChainAddress;
}

type BasePhysicalCryptoAsset = readonly [
  key: string,
  chain: string,
  contractAddress: string | null
];

export type PhysicalCryptoAsset =
  | BasePhysicalCryptoAsset
  | [...BasePhysicalCryptoAsset, start: number, end: number];

export type LogicalCryptoAsset = readonly [
  key: string,
  name: string,
  symbol: string,
  decimal: number,
  domains: Domains
];

/**
 * A KISS class to support a hard-coded crypto-asset database.
 */
export class StaticCryptoResolver extends CryptoResolver {
  private readonly cache: MMap<string, CryptoAsset>;
  private readonly logicalCryptoAssets: Map<string, LogicalCryptoAsset>;
  private readonly physicalCryptoAssets: Map<ChainAddress, PhysicalCryptoAsset>;

  protected constructor(
    physicalCryptoAssets: Iterable<PhysicalCryptoAsset>,
    logicalCryptoAssets: Iterable<LogicalCryptoAsset>
  ) {
    super();
    this.cache = new MMap();

    // Populate the table of logical crypto-assets
    this.logicalCryptoAssets = new Map();
    for (const [key, ...data] of logicalCryptoAssets) {
      this.logicalCryptoAssets.set(key, [key, ...data]);
    }

    // Populate the mapping from physical crypto-assets to logical crypto-assets
    this.physicalCryptoAssets = new Map();
    for (const [key, chain, contractAddress, ...data] of physicalCryptoAssets) {
      const chainAddress = ChainAddress(chain, contractAddress);
      this.physicalCryptoAssets.set(chainAddress, [
        key,
        chain,
        contractAddress,
        ...data,
      ]);
    }
  }

  static create(
    cryptoTable: Iterable<PhysicalCryptoAsset>,
    keyDomainsMap: Iterable<LogicalCryptoAsset> = []
  ): StaticCryptoResolver {
    return new this(cryptoTable, keyDomainsMap);
  }

  async resolve(
    registry: CryptoRegistry,
    chain: Blockchain,
    block: number,
    smartContractAddress: string | null,
    _name: string,
    _symbol: string,
    _decimal: number
  ): Promise<ResolutionResult> {
    const chainAddress = ChainAddress(chain.name, smartContractAddress); // XXX could this be done at higher level?

    // 1. Check that we know something about the crypto-asset
    const physicalCryptoAsset = this.physicalCryptoAssets.get(chainAddress);
    if (!physicalCryptoAsset) {
      return null; // not our business
    }

    // 2. Check that we are in the physical data specified [start, end) range if provided
    const [key, , , start, end] = physicalCryptoAsset;
    if (start !== undefined && end !== undefined) {
      // Above: technically we do not need to check that both `start` and `end`
      // are defined since the type's definition enforce "both or none". But
      // this satisfies the TypeScript compiler.
      if (block < start || block >= end) {
        return { status: "obsolete" };
      }
    }

    // 3. Maybe have we already cached the corresponding physical crypto-asset
    const cached = registry.getCryptoAsset(chainAddress);
    if (cached) {
      return { status: "resolved", asset: cached };
    }

    // 4. We should find the corresponding logical crypto-asset in our database
    const logicalCryptoAsset = this.logicalCryptoAssets.get(key);
    if (!logicalCryptoAsset) {
      throw new InternalError(
        `No matching logical crypto-asset for ${physicalCryptoAsset}`
      );
    }

    // 5. Eventually create, cache, then return the logical crypto-asset
    const [, name, symbol, decimal, domains] = logicalCryptoAsset;
    return {
      status: "resolved",
      asset: this.cache.get(key, () => {
        const crypto = new CryptoAsset(key, name, symbol, decimal);
        registry.registerCryptoAsset(chainAddress, crypto, domains);

        return crypto;
      }),
    };
  }

  /**
   * @internal
   * Utility to retrieve a cached crypto-asset by it key.
   *
   * For testing purposes only
   */
  get(key: string): CryptoAsset | null {
    return this.cache.get(key) ?? null;
  }
}
