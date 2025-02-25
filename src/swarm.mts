import { asBlockchain, type Blockchain } from "./blockchain.mjs";
import type { Explorer } from "./services/explorer.mjs";
import type { CryptoResolver } from "./services/cryptoresolver.mjs";
import type { CryptoRegistry } from "./cryptoregistry.mjs";
import { Address } from "./address.mjs";
import {
  Transaction,
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "./transaction.mjs";
import { ValueError } from "./error.mjs";
import { Block } from "./block.mjs";

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
  readonly blocks: Map<string, Block>;
  readonly addresses: Map<string, Address>;
  readonly records: Transaction[];
  readonly transactions: Map<string, NormalTransaction>;
  readonly explorers: Map<Blockchain, Explorer>;

  protected constructor(
    explorers: Explorer[],
    registry: CryptoRegistry,
    crypoResolver: CryptoResolver
  ) {
    // ISSUE #59 `cryptoResolver` is curious in the constructor's parameter list, as
    // it is both given to the constructor and injected as a dependency. May
    // `Swarm` keep a reference to the `cryptoResolver` and possibly
    // `CryptoRegistry` to reduce the number of parameter to inject when
    // calling the individual methods.
    this.blocks = new Map();
    this.addresses = new Map();
    this.records = [];
    this.transactions = new Map();
    this.explorers = new Map();
    for (const explorer of explorers) {
      this.explorers.set(explorer.chain, explorer);
      explorer.register(this, registry, crypoResolver); // ISSUE #60 Check what exactly is the purpose of the `.register` method
    }
  }

  static create(
    explorers: Explorer[],
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver
  ) {
    return new Swarm(explorers, registry, cryptoResolver);
  }

  getExplorer(chain: string | Blockchain): Explorer {
    const explorer = this.explorers.get(asBlockchain(chain));
    if (!explorer) {
      throw new ValueError(`Can't find an explorer for ${chain}`);
    }
    return explorer;
  }

  getNativeCurrency(chain: string | Blockchain) {
    return this.getExplorer(chain).nativeCurrency;
  }

  async store<T extends Storable, U extends T, OPT extends {}, K>(
    storage: Map<string, T>,
    ctor: new (swarm: Swarm, chain: Blockchain, id: K) => U,
    chain: Blockchain,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    id: K,
    data?: OPT
  ): Promise<U> {
    const key = `${chain.name}:${id}`.toLowerCase();
    let obj: U = storage.get(key) as U;
    if (!obj) {
      obj = new ctor(this, chain, id);
      // obj.__id = key;
      storage.set(key, obj);
    }

    if (data) {
      obj.assign(this, registry, cryptoResolver, data);
    }

    return obj;
  }

  block(
    chain: Blockchain,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    block: number
  ): Promise<Block> {
    return this.store(
      this.blocks,
      Block,
      chain,
      registry,
      cryptoResolver,
      block
    );
  }

  address(
    chain: Blockchain,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    address: string,
    data?: object
  ): Promise<Address> {
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
    chain: Blockchain,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    address: string,
    data?: object
  ): Promise<Address> {
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
  async normalTransaction(
    chain: Blockchain,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    hash: string,
    data?: Record<string, any>
  ): Promise<NormalTransaction> {
    const tr = await this.store(
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
  async tokenTransfer(
    chain: Blockchain,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): Promise<ERC20TokenTransfer> {
    const result = await new ERC20TokenTransfer(this, chain).assign(
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
  async internalTransaction(
    chain: Blockchain,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): Promise<InternalTransaction> {
    const result = await new InternalTransaction(this, chain).assign(
      this,
      registry,
      cryptoResolver,
      data
    );
    this.records.push(result);

    return result;
  }
}
