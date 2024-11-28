import { Explorer } from "./services/explorer.mjs";
import { Address } from "./address.mjs";
import { Transaction } from "./transaction.mjs";

export interface Storable {
  __id: string;
  assign(swarm: Swarm, data: object): void;
}

/**
 *  The swarm act as a repository that maps (chain, address) to Address objects.
 */
export class Swarm {
  readonly addresses: Map<string, Address>;
  readonly transactions: Map<string, Transaction>;
  readonly explorers: Map<string, Explorer>;

  constructor(explorers: Explorer[]) {
    this.addresses = new Map();
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

  store<T extends Storable, U extends T>(
    storage: Map<string, T>,
    ctor: new (swarm: Swarm, explorer: Explorer, id: string) => U,
    chain: string,
    id: string,
    data: object = {}
  ): T {
    const explorer = this.explorers.get(chain);
    if (!explorer) {
      throw new Error(`I can't explore The ${chain} chain`);
    }
    id = id.toLowerCase(); // XXX We do not handle mixed-case addresses properly

    const key = `${chain}:${id}`;

    let obj: T = storage.get(key);
    if (!obj) {
      obj = new ctor(this, explorer, id);
      obj.__id = key; // XXX This is ugly
      storage.set(key, obj);
    }

    obj.assign(this, data);

    return obj;
  }

  address(chain: string, address: string, data: object = {}): Address {
    return this.store(this.addresses, Address, chain, address, data);
  }

  transaction(
    ctor,
    chain: string,
    address: string,
    data: object = {}
  ): Transaction {
    return this.store(this.transactions, ctor, chain, address, data);
  }
}
