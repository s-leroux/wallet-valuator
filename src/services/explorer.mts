import { Swarm } from "../swarm.mjs";
import { NotImplementedError } from "../error.mjs";
import {
  Transaction,
  NormalTransaction,
  InternalTransaction,
  ERC20TokenTransfer,
} from "../transaction.mjs";
import { Blockchain } from "../blockchain.mjs";
import { CryptoAsset } from "../cryptoasset.mjs";

/**
 * The high-level interface to explorer a blockchain
 */
export class Explorer {
  readonly chain: Blockchain;
  readonly nativeCurrency: CryptoAsset;

  constructor(chain: Blockchain, nativeCurrency: CryptoAsset) {
    this.chain = chain;
    this.nativeCurrency = nativeCurrency;
  }

  register(swarm: Swarm): void {}

  async getInternalTransactionsByBlockNumber(
    swarm: Swarm,
    blockNumber: number
  ): Promise<Array<InternalTransaction>> {
    throw new NotImplementedError();
  }

  async getNormalTransactionByHash(
    swarm: Swarm,
    txhash: string
  ): Promise<NormalTransaction> {
    // OVERRIDE ME
    throw new NotImplementedError();
  }

  async getNormalTransactionsByAddress(
    swarm: Swarm,
    address: string
  ): Promise<Array<NormalTransaction>> {
    // OVERRIDE ME
    return [];
  }

  async getInternalTransactionsByAddress(
    swarm: Swarm,
    address: string
  ): Promise<Array<InternalTransaction>> {
    // OVERRIDE ME
    return [];
  }

  async getTokenTransfersByAddress(
    swarm: Swarm,
    address: string
  ): Promise<Array<ERC20TokenTransfer>> {
    // OVERRIDE ME
    return [];
  }

  async getAllValidTransactionsByAddress(
    swarm: Swarm,
    address: string
  ): Promise<Array<Transaction>> {
    const allTransfers = await this.getAllTransactionsByAddress(swarm, address);
    const selection = await Promise.all(
      allTransfers.map((tr) => tr.isValid(swarm))
    );

    return allTransfers.filter((_, index) => selection[index]);
  }

  /**
   * Return all the transfers involving a given address.
   *
   * You probably *don't* want to use this function but `addressAllValidTransfers` instead.
   */
  async getAllTransactionsByAddress(
    swarm: Swarm,
    address: string
  ): Promise<Array<Transaction>> {
    /*
     * Merge {normal, internal, token} transfers in one single list ordered by timestamp.
     */

    // naive implementation
    const [normal, internal, erc20] = await Promise.all([
      this.getNormalTransactionsByAddress(swarm, address),
      this.getInternalTransactionsByAddress(swarm, address),
      this.getTokenTransfersByAddress(swarm, address),
    ]);
    const result: Transaction[] = [];

    return result.concat(normal, internal, erc20);
  }
}

export class CommonExplorer extends Explorer {
  async blockInternalTransactions(
    blockNumber: number
  ): Promise<Record<string, any>[]> {
    // OVERRIDE ME
    return [];
  }

  async getInternalTransactionsByBlockNumber(
    swarm: Swarm,
    blockNumber: number
  ): Promise<Array<InternalTransaction>> {
    const res = await this.blockInternalTransactions(blockNumber);

    return await Promise.all(
      res.map((t) => swarm.internalTransaction(this.chain, t))
    );
  }

  async accountNormalTransactions(
    address: string
  ): Promise<Record<string, any>[]> {
    // OVERRIDE ME
    return [];
  }

  async getNormalTransactionsByAddress(swarm: Swarm, address: string) {
    const res = await this.accountNormalTransactions(address);

    return (
      await Promise.all(
        res.map((t) => swarm.normalTransaction(this.chain, t.hash, t))
      )
    ).filter((t) => t.data.isError === "0");
  }

  async accountInternalTransactions(
    address: string
  ): Promise<Record<string, any>[]> {
    // OVERRIDE ME
    return [];
  }

  async getInternalTransactionsByAddress(
    swarm: Swarm,
    address: string
  ): Promise<Array<InternalTransaction>> {
    const res = await this.accountInternalTransactions(address);

    return await Promise.all(
      res.map((t) => swarm.internalTransaction(this.chain, t))
    );
  }

  async accountTokenTransfers(address: string): Promise<Record<string, any>[]> {
    // OVERRIDE ME
    return [];
  }

  async getTokenTransfersByAddress(swarm: Swarm, address: string) {
    const res = await this.accountTokenTransfers(address);

    return await Promise.all(
      res.map((t) => swarm.tokenTransfer(this.chain, t))
    );
  }
}
