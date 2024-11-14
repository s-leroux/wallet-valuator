import {
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "./transaction.mjs";
import { Swarm } from "./swarm.mjs";

/**
 * An address on a chain.
 *
 * This class does not check the validity of the address format, nor if it exists.
 */
export class Address {
  readonly swarm: Swarm;
  readonly chain;
  readonly address;
  readonly data;

  constructor(swarm: Swarm, chain: string, address: string) {
    this.swarm = swarm;
    this.chain = chain;
    this.address = address;
    this.data = {};
  }
}
