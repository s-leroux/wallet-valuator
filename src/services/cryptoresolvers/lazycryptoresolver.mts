import { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoResolver } from "../cryptoresolver.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";

import { MMap } from "../../memoizer.mjs";

// XXX We may factor out the ChainAddress utility
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

  constructor() {
    super();
    this.cryptos = new MMap();
  }

  async resolve(
    registry: CryptoRegistry,
    chain: string,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): Promise<CryptoAsset | null> {
    const chainAddress = ChainAddress(chain, smartContractAddress);

    return this.cryptos.get(
      chainAddress,
      () => new CryptoAsset(chainAddress as string, name, symbol, decimal)
    );
  }

  /**
   * @internal
   * Utility to retrieve a cached crypto-asset by it key.
   *
   * For testing purposes only
   */
  async get(
    chain: string,
    contractAddress: string
  ): Promise<CryptoAsset | null> {
    return this.cryptos.get(ChainAddress(chain, contractAddress)) ?? null;
  }
}
