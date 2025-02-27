import type { Transaction } from "./transaction.mjs";
import { type DisplayOptions } from "./displayable.mjs";
import type { Swarm } from "./swarm.mjs";
import type { Explorer } from "./services/explorer.mjs";
import type { CryptoResolver } from "./services/cryptoresolver.mjs";
import { Blockchain } from "./blockchain.mjs";

export type BlockData = {};

/**
 * An block on a chain.
 *
 * This class does not check the validity of the address format, nor if it exists.
 */
export class Block {
  readonly explorer: Explorer;
  readonly blockNumber: number;
  readonly data: Partial<BlockData>;

  constructor(swarm: Swarm, chain: Blockchain, blockNumber: number) {
    if (blockNumber != parseInt(String(blockNumber)) || blockNumber < 0) {
      throw new Error(
        `The block number must be a strictly positive integer (was ${blockNumber})`
      );
    }

    this.explorer = swarm.getExplorer(chain);
    this.blockNumber = blockNumber;
    this.data = {};
  }

  assign(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    data: Partial<BlockData>
  ) {
    Object.assign(this.data, data);
  }

  toString() {
    return this.blockNumber;
  }

  toDisplayString(options: DisplayOptions) {
    return this.toString();
  }

  internalTransactions(
    swarm: Swarm,
    cryptoResolver: CryptoResolver
  ): Promise<Array<Transaction>> {
    return this.explorer.getInternalTransactionsByBlockNumber(
      swarm,
      cryptoResolver,
      this.blockNumber
    );
  }
}
