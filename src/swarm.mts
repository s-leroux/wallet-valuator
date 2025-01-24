import type { Explorer } from "./services/explorer.mjs";
import type { CryptoResolver } from "./services/cryptoresolver.mjs";
import type { DefaultCryptoResolver } from "./services/cryptoresolvers/defaultcryptoresolver.mjs";
import type { CryptoAsset } from "./cryptoasset.mjs";
import type { CryptoRegistry } from "./cryptoregistry.mjs";
import { Address } from "./address.mjs";
import {
  ChainRecord,
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "./transaction.mjs";

export interface Storable {
  assign(
    swarm: Swarm,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    data: object
  ): void;
}

/**
 *  The swarm act as a repository that maps (chain, address) to Address objects.
 */
export class Swarm {
  readonly addresses: Map<string, Address>;
  readonly records: ChainRecord[];
  readonly transactions: Map<string, NormalTransaction>;
  readonly explorers: Map<string, Explorer>;

  constructor(
    explorers: Explorer[],
    registry: CryptoRegistry,
    crypoResolver: CryptoResolver
  ) {
    // XXX `cryptoResolver` is curious in the constructor's parameter list, as
    // it is both given to the constructor and injected as a dependency. May
    // `Swarm` keep a reference to the `cryptoResolver` and possibly
    // `CryptoRegistry` to reduce the number of parameter to inject when
    // calling the individual methods.
    this.addresses = new Map();
    this.records = [];
    this.transactions = new Map();
    this.explorers = new Map();
    for (const explorer of explorers) {
      this.explorers.set(explorer.chain, explorer);
      explorer.register(this, registry, crypoResolver); // XXX Check what exactly is the purpose of the `.register` method
    }
  }

  explorer(chain: string): Explorer | undefined {
    return this.explorers.get(chain);
  }

  store<T extends Storable, U extends T, OPT extends {}>(
    storage: Map<string, T>,
    ctor: new (swarm: Swarm, explorer: Explorer, id: string) => U,
    explorer: Explorer,
    registry: CryptoRegistry,
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
      obj.assign(this, registry, cryptoResolver, data);
    }

    return obj;
  }

  address(
    chain: Explorer,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    address: string,
    data?: object
  ): Address {
    return this.store(
      this.addresses,
      Address,
      chain,
      registry,
      cryptoResolver,
      address,
      data
    );
  }

  contract(
    chain: Explorer,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    address: string,
    data?: object
  ): Address {
    return this.store(
      this.addresses,
      Address,
      chain,
      registry,
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
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    hash: string,
    data?: Record<string, any>
  ): NormalTransaction {
    const tr = this.store(
      this.transactions,
      NormalTransaction,
      chain,
      registry,
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
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): ERC20TokenTransfer {
    const result = new ERC20TokenTransfer(this, explorer).assign(
      this,
      registry,
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
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): InternalTransaction {
    const result = new InternalTransaction(this, explorer).assign(
      this,
      registry,
      cryptoResolver,
      data
    );
    this.records.push(result);

    return result;
  }
}
