import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { Blockchain } from "../../blockchain.mjs";
import type { Swarm } from "../../swarm.mjs";
import type { CryptoRegistry, Namespaces } from "../../cryptoregistry.mjs";
import { CryptoResolver, type ResolutionResult } from "../cryptoresolver.mjs";

import { InternalError } from "../../error.mjs";
import { ChainAddress } from "../../chainaddress.mjs";

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
  domains: Namespaces
];

/**
 * A KISS class to support a hard-coded crypto-asset database.
 */
export class StaticCryptoResolver extends CryptoResolver {
  // Database:
  private readonly logicalCryptoAssets: Map<string, LogicalCryptoAsset>;
  private readonly physicalCryptoAssets: Map<ChainAddress, PhysicalCryptoAsset>;

  // Cache
  private readonly cache: Map<ChainAddress, CryptoAsset>;

  protected constructor(
    physicalCryptoAssets: Iterable<Readonly<PhysicalCryptoAsset>>,
    logicalCryptoAssets: Iterable<Readonly<LogicalCryptoAsset>>
  ) {
    super();
    this.cache = new Map();

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

  getCryptoIds() {
    return this.logicalCryptoAssets.keys();
  }

  getCryptoAsset(registry: CryptoRegistry, id: string) {
    const logicalCryptoAsset = this.logicalCryptoAssets.get(id);
    if (!logicalCryptoAsset) {
      return undefined;
    }

    const [, name, symbol, decimals, namespaces] = logicalCryptoAsset;
    const crypto = registry.findCryptoAsset(id, name, symbol, decimals);
    registry.setNamespaces(crypto, namespaces);

    return crypto;
  }

  async resolve(
    swarm: Swarm,
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
    const [id, , , start, end] = physicalCryptoAsset;
    if (start !== undefined && end !== undefined) {
      // Above: technically we do not need to check that both `start` and `end`
      // are defined since the type's definition enforce "both or none". But
      // this satisfies the TypeScript compiler.
      if (block < start || block >= end) {
        return { status: "obsolete" };
      }
    }

    // 3. Maybe have we already cached the corresponding physical crypto-asset
    const cached = this.cache.get(chainAddress);
    if (cached) {
      return { status: "resolved", asset: cached };
    }

    // 4. We should find the corresponding logical crypto-asset in our database
    const logicalCryptoAsset = this.logicalCryptoAssets.get(id);
    if (!logicalCryptoAsset) {
      throw new InternalError(
        `No matching logical crypto-asset for ${physicalCryptoAsset}`
      );
    }

    // 5. Eventually create, update metadata, then return the logical crypto-asset
    const [, name, symbol, decimals, namespaces] = logicalCryptoAsset;
    const crypto = swarm.registry.findCryptoAsset(id, name, symbol, decimals);
    swarm.registry.setNamespaces(crypto, namespaces);
    this.cache.set(chainAddress, crypto);

    return {
      status: "resolved",
      asset: crypto,
    };
  }

  /**
   * @internal
   * Utility to retrieve a cached crypto-asset by its key.
   *
   * For testing purposes only
   */
  get(key: ChainAddress): CryptoAsset | null {
    return this.cache.get(key) ?? null;
  }
}
