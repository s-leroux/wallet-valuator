import type { OnChainTransaction, Transaction } from "./transaction.mjs";
import { defaultDisplayOptions, type DisplayOptions } from "./displayable.mjs";
import type { Swarm } from "./swarm.mjs";
import type { Explorer } from "./services/explorer.mjs";
import { Blockchain } from "./blockchain.mjs";
import { ValueError } from "./error.mjs";
import { Account } from "./account.mjs";
import { ChainAddress } from "./chainaddress.mjs";

type ERC20TokenAddressData = {
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
};

type AnyAddressData = {
  name: string;
};

export type AddressData = AnyAddressData & ERC20TokenAddressData;

/**
 * An address on a chain.
 *
 * This class does not check the validity of the address format, nor if it exists.
 */
export class Address implements Account {
  readonly chain: Blockchain;
  readonly address: string;
  readonly chainAddress: ChainAddress; // #ISSUE 118 This is redundant with chain and address above!
  readonly explorer: Explorer;
  readonly data: Partial<AddressData>;

  constructor(swarm: Swarm, chain: Blockchain, address: string) {
    if (!address) {
      throw new ValueError("The empty string is not a valid address");
    }

    this.chainAddress = ChainAddress(chain, address);
    this.chain = chain;
    this.address = address.toLowerCase();
    this.explorer = swarm.getExplorer(chain);
    this.data = {};
  }

  loadTransactions(swarm: Swarm): Promise<Transaction[]> {
    return this.allValidTransfers(swarm);
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
    const useName =
      options["address.name"] ?? defaultDisplayOptions["address.name"];
    if (useName && this.data.name) {
      return this.data.name;
    }

    const useCompactAddress =
      options["address.compact"] ?? defaultDisplayOptions["address.compact"];
    if (!useCompactAddress) {
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

  normalTransactions(swarm: Swarm): Promise<Array<OnChainTransaction>> {
    return this.explorer.getNormalTransactionsByAddress(swarm, this.address);
  }

  internalTransactions(swarm: Swarm): Promise<Array<OnChainTransaction>> {
    return this.explorer.getInternalTransactionsByAddress(swarm, this.address);
  }

  tokenTransfers(swarm: Swarm): Promise<Array<OnChainTransaction>> {
    return this.explorer.getTokenTransfersByAddress(swarm, this.address);
  }

  allTransfers(swarm: Swarm): Promise<Array<OnChainTransaction>> {
    return this.explorer.getAllTransactionsByAddress(swarm, this.address);
  }

  allValidTransfers(swarm: Swarm): Promise<Array<OnChainTransaction>> {
    return this.explorer.getAllValidTransactionsByAddress(swarm, this.address);
  }
}
