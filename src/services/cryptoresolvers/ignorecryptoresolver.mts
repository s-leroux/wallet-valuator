import { CryptoResolver, type ResolutionResult } from "../cryptoresolver.mjs";
import type { Blockchain } from "../../blockchain.mjs";
import type { Swarm } from "../../swarm.mjs";
import type { CryptoMetadata } from "../../cryptoregistry.mjs";

import { logger as logger } from "../../debug.mjs";
const log = logger("provider");

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

  // eslint-disable-next-line @typescript-eslint/require-await
  async resolve(
    swarm: Swarm,
    cryptoMetadata: CryptoMetadata,
    chain: Blockchain,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): Promise<ResolutionResult> {
    log.warn(
      "C2001",
      "%s",
      `Ignoring token ${name} (${symbol}) ${chain}:${smartContractAddress} @ ${block}`
    );
    return { status: "ignore" };
  }
}
