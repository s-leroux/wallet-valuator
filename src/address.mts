import {
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "./transaction.mjs";
import { Swarm } from "./swarm.mjs";
import { Explorer } from "./services/explorer.mjs";

/**
 * An address on a chain.
 *
 * This class does not check the validity of the address format, nor if it exists.
 */
export class Address {
  __id: string;
  readonly swarm: Swarm;
  readonly explorer: Explorer;
  readonly chain: string;
  readonly address: string;
  readonly data: object;

  constructor(swarm: Swarm, chain: string, address: string) {
    this.swarm = swarm;
    this.explorer = swarm.explorer(chain);
    this.chain = chain; // redundant with this.explorer.chain
    this.address = address;
    this.data = {};
  }
}
