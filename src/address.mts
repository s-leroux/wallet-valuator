import type {
  ChainRecord,
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "./transaction.mjs";
import type { Swarm } from "./swarm.mjs";
import type { Explorer } from "./services/explorer.mjs";
import type { CryptoResolver } from "./services/cryptoresolver.mjs";

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
  readonly address: string;
  readonly data: Partial<AddressData>;

  constructor(swarm: Swarm, explorer: Explorer, address: string) {
    if (!address) {
      throw new Error("Then empty string is not a valid address");
    }

    this.explorer = explorer;
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
  assign(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    data: Partial<AddressData>
  ) {
    Object.assign(this.data, data);
  }

  toString(format?: { compact?: boolean }) {
    const compact = format?.compact ?? true;
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

  normalTransactions(
    swarm: Swarm,
    cryptoResolver: CryptoResolver
  ): Promise<Array<ChainRecord>> {
    return this.explorer.getNormalTransactionsByAddress(
      swarm,
      cryptoResolver,
      this.address
    );
  }

  internalTransactions(
    swarm: Swarm,
    cryptoResolver: CryptoResolver
  ): Promise<Array<ChainRecord>> {
    return this.explorer.getInternalTransactionsByAddress(
      swarm,
      cryptoResolver,
      this.address
    );
  }

  tokenTransfers(
    swarm: Swarm,
    cryptoResolver: CryptoResolver
  ): Promise<Array<ChainRecord>> {
    return this.explorer.getTokenTransfersByAddress(
      swarm,
      cryptoResolver,
      this.address
    );
  }

  allTransfers(
    swarm: Swarm,
    cryptoResolver: CryptoResolver
  ): Promise<Array<ChainRecord>> {
    return this.explorer.getAllTransactionsByAddress(
      swarm,
      cryptoResolver,
      this.address
    );
  }

  allValidTransfers(
    swarm: Swarm,
    cryptoResolver: CryptoResolver
  ): Promise<Array<ChainRecord>> {
    return this.explorer.getAllValidTransactionsByAddress(
      swarm,
      cryptoResolver,
      this.address
    );
  }
}
