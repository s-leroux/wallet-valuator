import { CryptoResolver, ResolutionResult } from "../cryptoresolver.mjs";
import type { Blockchain } from "../../blockchain.mjs";
import { Swarm } from "../../swarm.mjs";

/**
 * A `CryptoResolver` that sequentially delegates resolution to multiple
 * backend resolvers. It tries each resolver in order until one successfully
 * resolves the crypto asset or all have been attempted.
 */
export class CompositeCryptoResolver extends CryptoResolver {
  private constructor(readonly backends: CryptoResolver[]) {
    super();
  }

  /**
   * Resolves a token to its corresponding logical `CryptoAsset`.
   */
  async resolve(
    swarm: Swarm,
    chain: Blockchain,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): Promise<ResolutionResult> {
    for (const backend of this.backends) {
      const result = await backend.resolve(
        swarm,
        chain,
        block,
        smartContractAddress,
        name,
        symbol,
        decimal
      );
      if (result) {
        return result;
      }
    }
    return null;
  }

  static create(backends: CryptoResolver[]): CompositeCryptoResolver {
    return new this(backends);
  }
}
