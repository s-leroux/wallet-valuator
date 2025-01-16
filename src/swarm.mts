import type { Explorer } from "./services/explorer.mjs";
import type { CryptoResolver } from "./services/cryptoresolver.mjs";
import type { DefaultCryptoResolver } from "./services/cryptoresolvers/defaultcryptoresolver.mjs";
import type { CryptoAsset } from "./cryptoasset.mjs";
import { Address } from "./address.mjs";
import {
  ChainRecord,
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "./transaction.mjs";

export interface Storable {
  assign(swarm: Swarm, cryptoResolver: CryptoResolver, data: object): void;
}

/**
 *  The swarm act as a repository that maps (chain, address) to Address objects.
 */
export class Swarm {
  readonly addresses: Map<string, Address>;
  readonly records: ChainRecord[];
  readonly transactions: Map<string, NormalTransaction>;
  readonly explorers: Map<string, Explorer>;

  constructor(explorers: Explorer[], crypoResolver: CryptoResolver) {
    this.addresses = new Map();
    this.records = [];
    this.transactions = new Map();
    this.explorers = new Map();
    for (const explorer of explorers) {
      this.explorers.set(explorer.chain, explorer);
      explorer.register(this, crypoResolver);
    }
  }

  explorer(chain: string): Explorer | undefined {
    return this.explorers.get(chain);
  }

  store<T extends Storable, U extends T, OPT extends {}>(
    storage: Map<string, T>,
    ctor: new (swarm: Swarm, explorer: Explorer, id: string) => U,
    explorer: Explorer,
    cryptoResolver: CryptoResolver,
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
      obj.assign(this, cryptoResolver, data);
    }

    return obj;
  }

  address(
    chain: Explorer,
    cryptoResolver: CryptoResolver,
    address: string,
    data?: object
  ): Address {
    return this.store(
      this.addresses,
      Address,
      chain,
      cryptoResolver,
      address,
      data
    );
  }

  contract(
    chain: Explorer,
    cryptoResolver: CryptoResolver,
    address: string,
    data?: object
  ): Address {
    return this.store(
      this.addresses,
      Address,
      chain,
      cryptoResolver,
      address,
      data
    );
  }

  /**
   * Return the NormalTransaction corresponding to the hash
   */
  normalTransaction(
    chain: Explorer,
    cryptoResolver: CryptoResolver,
    hash: string,
    data?: Record<string, any>
  ): NormalTransaction {
    const tr = this.store(
      this.transactions,
      NormalTransaction,
      chain,
      cryptoResolver,
      hash,
      data
    );
    this.records.push(tr);

    return tr;
  }

  /**
   *  Returns a new ERC20 Token Transfer
   */
  tokenTransfer(
    explorer: Explorer,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): ERC20TokenTransfer {
    const result = new ERC20TokenTransfer(this, explorer).assign(
      this,
      cryptoResolver,
      data
    );
    this.records.push(result);

    return result;
  }

  /**
   * Return a new Internal Transaction
   */
  internalTransaction(
    explorer: Explorer,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): ERC20TokenTransfer {
    const result = new InternalTransaction(this, explorer).assign(
      this,
      cryptoResolver,
      data
    );
    this.records.push(result);

    return result;
  }
}
