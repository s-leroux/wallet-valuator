import { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoResolver, ResolutionResult } from "../cryptoresolver.mjs";
import type {
  CryptoRegistry,
  Domains,
  Metadata,
} from "../../cryptoregistry.mjs";

import { MMap } from "../../memoizer.mjs";
import { Blockchain } from "../../blockchain.mjs";

// XXX We may factor out the ChainAddress utility
type ChainAddress = string & { readonly brand: unique symbol };
function ChainAddress(
  chain: string,
  smartContractAddress: string | null
): ChainAddress {
  return `${chain}:${smartContractAddress || ""}`.toLowerCase() as ChainAddress;
}

export type StaticCryptoAsset = readonly [
  key: string,
  chain: string,
  contractAddress: string | null,
  name: string,
  symbol: string,
  decimal: number
];

export type StaticDomains = readonly [key: string, domains: Domains];

type Entry = {
  key: string;
  name: string;
  symbol: string;
  decimal: number;
};

/**
 * A KISS class to support a hard-coded crypto-asset database.
 */
export class StaticCryptoResolver extends CryptoResolver {
  private readonly cache: MMap<string, CryptoAsset>;
  private readonly keyDomainMap: Map<string, Domains>;
  private readonly cryptoDatabase: Map<ChainAddress, Entry>;

  protected constructor(
    cryptoTable: Iterable<StaticCryptoAsset>,
    keyDomainsMap: Iterable<StaticDomains> = []
  ) {
    super();
    this.cache = new MMap();
    const cryptoDatabase = (this.cryptoDatabase = new Map());

    for (const [
      key,
      chain,
      contractAddress,
      name,
      symbol,
      decimal,
    ] of cryptoTable) {
      const chainAddress = ChainAddress(chain, contractAddress);
      const entry = {
        // @ts-ignore
        __proto__: null,
        key,
        name,
        symbol,
        decimal,
      };
      cryptoDatabase.set(chainAddress, entry);
    }

    this.keyDomainMap = new Map();
    for (const [key, domains] of keyDomainsMap) {
      this.keyDomainMap.set(key, domains);
    }
  }

  static create(
    cryptoTable: Iterable<StaticCryptoAsset>,
    keyDomainsMap: Iterable<StaticDomains> = []
  ): StaticCryptoResolver {
    return new this(cryptoTable, keyDomainsMap);
  }

  async resolve(
    registry: CryptoRegistry,
    chain: Blockchain,
    block: number,
    smartContractAddress: string | null,
    name: string,
    symbol: string,
    decimal: number
  ): Promise<ResolutionResult> {
    const chainAddress = ChainAddress(chain.name, smartContractAddress); // XXX could this be done at higher level?
    const cached = registry.getCryptoAsset(chainAddress);
    if (cached) {
      return { status: "resolved", asset: cached }; // XXX This may change for "obsolete" crypto-assets
    }

    const entry = this.cryptoDatabase.get(chainAddress);
    if (!entry) {
      return null;
    }

    return {
      status: "resolved",
      asset: this.cache.get(entry.key, () => {
        const crypto = new CryptoAsset(
          entry.key,
          entry.name,
          entry.symbol,
          entry.decimal
        );
        registry.registerCryptoAsset(
          chainAddress,
          crypto,
          this.keyDomainMap.get(entry.key)
        );

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
