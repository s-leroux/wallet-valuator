import {
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "./transaction.mjs";
import { Swarm, Storable } from "./swarm.mjs";
import { Explorer } from "./services/explorer.mjs";
import type { Ledger } from "./ledger.mjs";

/**
 * An address on a chain.
 *
 * This class does not check the validity of the address format, nor if it exists.
 */
export class Address implements Storable {
  __id: string;
  readonly explorer: Explorer;
  readonly chain: string;
  readonly address: string;
  readonly data: object;

  constructor(swarm: Swarm, explorer: Explorer, address: string) {
    this.explorer = explorer;
    this.chain = explorer.chain; // redundant with this.explorer.chain
    this.address = address;
    this.data = {};
  }

  assign(swarm, data) {
    Object.assign(this.data, data);
  }

  normalTransactions(swarm: Swarm): Promise<Ledger> {
    return this.explorer.addressNormalTransactions(swarm, this.address);
  }

  internalTransactions(swarm: Swarm): Promise<Ledger> {
    return this.explorer.addressInternalTransactions(swarm, this.address);
  }

  tokenTransfers(swarm: Swarm): Promise<Ledger> {
    return this.explorer.addressTokenTransfers(swarm, this.address);
  }

  allTransfers(swarm: Swarm): Promise<Ledger> {
    return this.explorer.addressAllTransfers(swarm, this.address);
  }
}
