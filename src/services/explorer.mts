import { Swarm } from "../swarm.mjs";
import { Ledger } from "../ledger.mjs";

/**
 * The high-level interface to explorer a blockchain
 */
export class Explorer {
  readonly chain: string;

  constructor(chain: string = "gnosis") {
    this.chain = chain;
  }

  register(swarm: Swarm): void {}

  async addressNormalTransactions(
    swarm: Swarm,
    address: string
  ): Promise<Ledger> {
    // OVERRIDE ME
    return Ledger.create();
  }

  async addressInternalTransactions(
    swarm: Swarm,
    address: string
  ): Promise<Ledger> {
    // OVERRIDE ME
    return Ledger.create();
  }

  async addressTokenTransfers(swarm: Swarm, address: string): Promise<Ledger> {
    // OVERRIDE ME
    return Ledger.create();
  }

  async addressAllTransfers(swarm: Swarm, address: string): Promise<Ledger> {
    /*
     * Merge {normal, internal, token} transfers in one single list ordered by timestamp.
     */

    // naive implementation
    const [normal, internal, erc20] = await Promise.all([
      this.addressNormalTransactions(swarm, address),
      this.addressInternalTransactions(swarm, address),
      this.addressTokenTransfers(swarm, address),
    ]);

    return Ledger.create(normal).union(internal).union(erc20);
  }
}
