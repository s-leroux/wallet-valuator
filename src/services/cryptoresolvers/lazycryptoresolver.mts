import { CryptoResolver, ResolutionResult } from "../cryptoresolver.mjs";

import type { Blockchain } from "../../blockchain.mjs";
import type { Swarm } from "../../swarm.mjs";
import { CryptoMetadata } from "../../cryptometadata.mjs";

// ISSUE #98 We may factor out the ChainAddress utility
type ChainAddress = string & { readonly brand: unique symbol };
function ChainAddress(
  chain: string,
  smartContractAddress: string | null,
): ChainAddress {
  return `${chain}:${smartContractAddress || ""}`.toLowerCase() as ChainAddress;
}

/**
 * `LazyCryptoResolver`
 *
 * A catch-all {@link CryptoResolver} that creates logical
 * `CryptoAsset` instances on demand for tokens that no other resolver
 * recognised.
 *
 * Because the token is unrecognised, there is no known cross-chain equivalence,
 * so the resolver creates a **singleton** logical asset whose `id` is derived
 * from the chain-address (e.g. `"ethereum:0xa0b8…"`). That asset is a logical
 * equivalence class of size one — a single physical representative mapped to
 * its own dedicated logical `CryptoAsset`.
 *
 * By design, crypto assets returned by this class **cannot** be cross-chain.
 */
export class LazyCryptoResolver extends CryptoResolver {
  protected constructor() {
    super();
  }

  static create() {
    return new LazyCryptoResolver();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async resolve(
    swarm: Swarm,
    cryptoMetadata: CryptoMetadata,
    chain: Blockchain,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number,
  ): Promise<ResolutionResult> {
    const chainAddress = ChainAddress(chain.id, smartContractAddress);
    return {
      status: "resolved",
      asset: swarm.cryptoRegistry.createCryptoAsset(
        chainAddress,
        name,
        symbol,
        decimal,
      ),
    };
  }
}
