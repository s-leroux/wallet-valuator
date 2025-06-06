import { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoResolver, ResolutionResult } from "../cryptoresolver.mjs";

import { MMap } from "../../memoizer.mjs";
import type { Blockchain } from "../../blockchain.mjs";
import type { Swarm } from "../../swarm.mjs";

// ISSUE #98 We may factor out the ChainAddress utility
type ChainAddress = string & { readonly brand: unique symbol };
function ChainAddress(
  chain: string,
  smartContractAddress: string | null
): ChainAddress {
  return `${chain}:${smartContractAddress || ""}`.toLowerCase() as ChainAddress;
}

export type LazyCryptoAsset = readonly [
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
 * `LazyCryptoResolver`
 *
 * This resolver acts as a catch-all `CryptoResolver`, creating and caching
 * new crypto assets on demand. Each asset is identified by a unique
 * (chain, smart contract address) pair.
 *
 * By design, crypto assets returned by this class **cannot** be cross-chain.
 */
export class LazyCryptoResolver extends CryptoResolver {
  private readonly cryptos: MMap<ChainAddress, CryptoAsset>;

  protected constructor() {
    super();
    this.cryptos = new MMap();
  }

  static create() {
    return new LazyCryptoResolver();
  }

  async resolve(
    swarm: Swarm,
    chain: Blockchain,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): Promise<ResolutionResult> {
    const chainAddress = ChainAddress(chain.name, smartContractAddress);

    return {
      status: "resolved",
      asset: this.cryptos.get(chainAddress, () =>
        swarm.registry.createCryptoAsset(chainAddress, name, symbol, decimal)
      ),
    };
  }

  /**
   * @internal
   * Utility to retrieve a cached crypto-asset by it key.
   *
   * For testing purposes only
   */
  get(chain: string, contractAddress: string): CryptoAsset {
    if (process.env.NODE_ENV !== "test") {
      throw new Error(
        "This method is for testing purposes only and cannot be called in production code"
      );
    }
    return this.cryptos.get(ChainAddress(chain, contractAddress));
  }
}
