import { CryptoResolver, type ResolutionResult } from "../cryptoresolver.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";
import type { Blockchain } from "../../blockchain.mjs";
import type { Swarm } from "../../swarm.mjs";

/**
 * `IgnoreCryptoResolver`
 *
 * This resolver acts as a catch-all `CryptoResolver`, always returning `{ status: "ignore" }`
 */
export class IgnoreCryptoResolver extends CryptoResolver {
  protected constructor() {
    super();
  }

  static create() {
    return new IgnoreCryptoResolver();
  }

  async resolve(
    swarm: Swarm,
    registry: CryptoRegistry,
    chain: Blockchain,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): Promise<ResolutionResult> {
    console.log("%s", `Ignoring token ${name} (${symbol})`);
    return { status: "ignore" };
  }
}
