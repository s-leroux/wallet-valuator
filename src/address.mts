import type { Transaction } from "./transaction.mjs";
import { defaultDisplayOptions, type DisplayOptions } from "./displayable.mjs";
import type { Swarm } from "./swarm.mjs";
import type { Explorer } from "./services/explorer.mjs";
import { Blockchain } from "./blockchain.mjs";

type ERC20TokenAddressData = {
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
};

type AnyAddressData = {
  from: string;
  to: string;
};

export type AddressData = AnyAddressData & ERC20TokenAddressData;

/**
 * An address on a chain.
 *
 * This class does not check the validity of the address format, nor if it exists.
 */
export class Address {
  readonly explorer: Explorer;
  readonly address: string; // this is guaranteed to be lowercase!
  readonly data: Partial<AddressData>;

  constructor(swarm: Swarm, chain: Blockchain, address: string) {
    if (!address) {
      throw new Error("Then empty string is not a valid address");
    }

    this.explorer = swarm.getExplorer(chain);
    this.address = address.toLowerCase();
    this.data = {};
  }

  /*
  resolveCurrency(blockNumber: number): Currency {
    if (!this.transitions) {
      console.dir(this);
      throw new TypeError(`No currency associated with address ${this}`);
    }
    const transition = this.transitions.findLast((t) =>
      t.isApplicable(this.explorer, this.address, blockNumber)
    );

    if (!transition) {
      console.dir(this);
      throw new TypeError(`No currency associated with address ${this}`);
    }

    return transition.currency;
  }
*/
  assign(swarm: Swarm, data: Partial<AddressData>) {
    Object.assign(this.data, data);
  }

  toString() {
    return this.address;
  }

  toDisplayString(options: DisplayOptions) {
    const compact =
      options["address.compact"] ?? defaultDisplayOptions["address.compact"];
    if (!compact) {
      return this.address;
    }

    const prefix = 2;
    const start = 6;
    const end = 6;
    const sep = "...";
    const compactLength = prefix + start + end + sep.length;
    if (this.address.length <= compactLength) {
      return this.address;
    }

    return (
      this.address.slice(0, prefix + start) + sep + this.address.slice(-end)
    );
  }

  normalTransactions(swarm: Swarm): Promise<Array<Transaction>> {
    return this.explorer.getNormalTransactionsByAddress(swarm, this.address);
  }

  internalTransactions(swarm: Swarm): Promise<Array<Transaction>> {
    return this.explorer.getInternalTransactionsByAddress(swarm, this.address);
  }

  tokenTransfers(swarm: Swarm): Promise<Array<Transaction>> {
    return this.explorer.getTokenTransfersByAddress(swarm, this.address);
  }

  allTransfers(swarm: Swarm): Promise<Array<Transaction>> {
    return this.explorer.getAllTransactionsByAddress(swarm, this.address);
  }

  allValidTransfers(swarm: Swarm): Promise<Array<Transaction>> {
    return this.explorer.getAllValidTransactionsByAddress(swarm, this.address);
  }
}
