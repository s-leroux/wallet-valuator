import {
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "./transaction.mjs";
import { Swarm } from "./swarm.mjs";
import { Explorer } from "./services/explorer.mjs";
import type { Ledger } from "./ledger.mjs";

/**
 * An address on a chain.
 *
 * This class does not check the validity of the address format, nor if it exists.
 */
export class Address {
  __id: string;
  readonly explorer: Explorer;
  readonly chain: string;
  readonly address: string;
  readonly data: object;

  constructor(explorer: Explorer, address: string) {
    this.explorer = explorer;
    this.chain = explorer.chain; // redundant with this.explorer.chain
    this.address = address;
    this.data = {};
  }

  internalTransactions(swarm: Swarm): Promise<Ledger> {
    return this.explorer.addressInternalTransactions(swarm, this.address);
  }
}
