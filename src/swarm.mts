import { Explorer } from "./services/explorer.mjs";
import { Address } from "./address.mjs";
import {
  ChainRecord,
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "./transaction.mjs";

export interface Storable {
  assign(swarm: Swarm, data: object): void;
}

/**
 *  The swarm act as a repository that maps (chain, address) to Address objects.
 */
export class Swarm {
  readonly addresses: Map<string, Address>;
  readonly records: ChainRecord[];
  readonly transactions: Map<string, NormalTransaction>;
  readonly explorers: Map<string, Explorer>;

  constructor(explorers: Explorer[]) {
    this.addresses = new Map();
    this.records = [];
    this.transactions = new Map();
    this.explorers = new Map();
    for (const explorer of explorers) {
      this.explorers.set(explorer.chain, explorer);
      explorer.register(this);
    }
  }

  explorer(chain: string): Explorer {
    return this.explorers.get(chain);
  }

  store<T extends Storable, U extends T, OPT extends {}>(
    storage: Map<string, T>,
    ctor: new (swarm: Swarm, explorer: Explorer, id: string) => U,
    explorer: Explorer,
    id: string,
    data?: OPT
  ): U {
    const key = `${explorer.chain}:${id}`.toLowerCase();
    let obj: U = storage.get(key) as U;
    if (!obj) {
      obj = new ctor(this, explorer, id);
      // obj.__id = key;
      storage.set(key, obj);
    }

    if (data) {
      obj.assign(this, data);
    }

    return obj;
  }

  address(chain: Explorer, address: string, data?: object): Address {
    return this.store(this.addresses, Address, chain, address, data);
  }

  contract(chain: Explorer, address: string, data?: object): Address {
    return this.store(this.addresses, Address, chain, address, data);
  }

  /**
   * Return the NormalTransaction corresponding to the hash
   */
  normalTransaction(
    chain: Explorer,
    hash: string,
    data?: object
  ): NormalTransaction {
    const tr = this.store(
      this.transactions,
      NormalTransaction,
      chain,
      hash,
      data
    );
    this.records.push(tr);

    return tr;
  }

  /**
   *  Returns a new ERC20 Token Transfer
   */
  tokenTransfer(explorer: Explorer, data): ERC20TokenTransfer {
    const result = new ERC20TokenTransfer(this, explorer).assign(this, data);
    this.records.push(result);

    return result;
  }

  /**
   * Return a new Internal Transaction
   */
  internalTransaction(explorer: Explorer, data): ERC20TokenTransfer {
    const result = new InternalTransaction(this, explorer).assign(this, data);
    this.records.push(result);

    return result;
  }
}
