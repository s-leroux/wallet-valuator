import { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoResolver, ResolutionResult } from "../cryptoresolver.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";

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
  private readonly cryptos: MMap<string, CryptoAsset>;
  private readonly database: Map<ChainAddress, Entry>;

  protected constructor(source: Iterable<StaticCryptoAsset>) {
    super();
    this.cryptos = new MMap();
    const database = (this.database = new Map());

    for (const [key, chain, contractAddress, name, symbol, decimal] of source) {
      const chainAddress = ChainAddress(chain, contractAddress);
      const entry = {
        __proto__: null,
        key,
        name,
        symbol,
        decimal,
      };
      database.set(chainAddress, entry);
    }
  }

  static create(source: Iterable<StaticCryptoAsset>): StaticCryptoResolver {
    return new this(source);
  }

  async resolve(
    registry: CryptoRegistry,
    chain: Blockchain,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): Promise<ResolutionResult> {
    const chainAddress = ChainAddress(chain.name, smartContractAddress);
    const entry = this.database.get(chainAddress);
    if (!entry) {
      return null;
    }
    return {
      status: "resolved",
      asset: this.cryptos.get(
        entry.key,
        () =>
          new CryptoAsset(entry.key, entry.name, entry.symbol, entry.decimal)
      ),
    };
  }

  /**
   * @internal
   * Utility to retrieve a cached crypto-asset by it key.
   *
   * For testing purposes only
   */
  get(key: string): CryptoAsset | null {
    return this.cryptos.get(key) ?? null;
  }
}
