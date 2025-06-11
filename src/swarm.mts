import { asBlockchain, type Blockchain } from "./blockchain.mjs";
import type {
  Explorer,
  InternalTransactionRecord,
  NormalTransactionRecord,
  TokenTransferRecord,
} from "./services/explorer.mjs";
import type {
  CryptoResolver,
  ResolutionResult,
} from "./services/cryptoresolver.mjs";
import type { CryptoMetadata, CryptoRegistryNG } from "./cryptoregistry.mjs";
import { Address } from "./address.mjs";
import {
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "./transaction.mjs";
import { ValueError } from "./error.mjs";
import { Block } from "./block.mjs";

export interface Storable {
  assign(swarm: Swarm, data: object): void;
}

/**
 *  The swarm act as a repository that maps (chain, address) to Address objects.
 */
export class Swarm {
  readonly blocks: Map<string, Block>;
  readonly addresses: Map<string, Address>;
  readonly normalTransactions: Map<string, NormalTransaction>;
  readonly internalTransactions: Map<string, InternalTransaction>;
  readonly explorers: Map<Blockchain, Explorer>;

  protected constructor(
    explorers: Explorer[],
    readonly cryptoRegistry: CryptoRegistryNG,
    readonly cryptoMetadata: CryptoMetadata,
    readonly cryptoResolver: CryptoResolver
  ) {
    this.blocks = new Map();
    this.addresses = new Map();
    this.normalTransactions = new Map();
    this.internalTransactions = new Map();
    this.explorers = new Map();
    for (const explorer of explorers) {
      this.explorers.set(explorer.chain, explorer);
      explorer.register(this);
    }
  }

  static create(
    explorers: Explorer[],
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    cryptoResolver: CryptoResolver
  ) {
    return new Swarm(explorers, cryptoRegistry, cryptoMetadata, cryptoResolver);
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

  async resolve(
    chain: Blockchain,
    block: number,
    smartContractAddress: string | null,
    name: string,
    symbol: string,
    decimal: number
  ): Promise<ResolutionResult> {
    if (!smartContractAddress) {
      // We are looking for a native currency
      return { status: "resolved", asset: this.getNativeCurrency(chain) };
    }

    return this.cryptoResolver.resolve(
      this,
      this.cryptoMetadata,
      chain,
      block,
      smartContractAddress,
      name,
      symbol,
      decimal
    );
  }

  async store<T extends Storable, U extends T, OPT extends {}, K>(
    storage: Map<string, T>,
    ctor: new (swarm: Swarm, chain: Blockchain, id: K) => U,
    chain: Blockchain,
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
      await obj.assign(this, data); // Potentially obj.assign is an async function
    }

    return obj;
  }

  block(chain: Blockchain, block: number): Promise<Block> {
    return this.store(this.blocks, Block, chain, block);
  }

  address(chain: Blockchain, address: string, data?: object): Promise<Address> {
    return this.store(this.addresses, Address, chain, address, data);
  }

  contract(
    chain: Blockchain,
    address: string,
    data?: object
  ): Promise<Address> {
    return this.store(this.addresses, Address, chain, address, data);
  }

  /**
   * Return the NormalTransaction corresponding to the hash
   */
  async normalTransaction(
    chain: Blockchain,
    hash: string,
    data?: NormalTransactionRecord
  ): Promise<NormalTransaction> {
    return this.store(
      this.normalTransactions,
      NormalTransaction,
      chain,
      hash,
      data
    );
  }

  /**
   *  Returns a new ERC20 Token Transfer
   */
  async tokenTransfer(
    chain: Blockchain,
    data: TokenTransferRecord
  ): Promise<ERC20TokenTransfer> {
    return new ERC20TokenTransfer(this, chain).assign(this, data);
  }

  /**
   * Return a new Internal Transaction
   */
  async internalTransaction(
    chain: Blockchain,
    txHash: string,
    traceId: string,
    data: InternalTransactionRecord
  ): Promise<InternalTransaction> {
    return this.store(
      this.internalTransactions,
      InternalTransaction,
      chain,
      `${txHash}-${traceId}`,
      data
    );
  }
}
