import { Swarm } from "../swarm.mjs";
import { NotImplementedError } from "../error.mjs";
import {
  OnChainTransaction,
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
  ): Promise<Array<OnChainTransaction>> {
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
  ): Promise<Array<OnChainTransaction>> {
    /*
     * Merge {normal, internal, token} transfers in one single list ordered by timestamp.
     */

    // naive implementation
    const [normal, internal, erc20] = await Promise.all([
      this.getNormalTransactionsByAddress(swarm, address),
      this.getInternalTransactionsByAddress(swarm, address),
      this.getTokenTransfersByAddress(swarm, address),
    ]);
    const result: OnChainTransaction[] = [];

    return result.concat(normal, internal, erc20);
  }
}

export class CommonExplorer extends Explorer {
  async blockInternalTransactions(
    blockNumber: number
  ): Promise<InternalTransactionRecord[]> {
    // OVERRIDE ME
    return [];
  }

  async getInternalTransactionsByBlockNumber(
    swarm: Swarm,
    blockNumber: number
  ): Promise<Array<InternalTransaction>> {
    const res = await this.blockInternalTransactions(blockNumber);

    return await Promise.all(
      res.map((t) =>
        swarm.internalTransaction(this.chain, t.hash, t.traceId, t)
      )
    );
  }

  async accountNormalTransactions(
    address: string
  ): Promise<NormalTransactionRecord[]> {
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
  ): Promise<InternalTransactionRecord[]> {
    // OVERRIDE ME
    return [];
  }

  async getInternalTransactionsByAddress(
    swarm: Swarm,
    address: string
  ): Promise<InternalTransaction[]> {
    const res = await this.accountInternalTransactions(address);

    return await Promise.all(
      res.map((t) =>
        swarm.internalTransaction(this.chain, t.hash, t.traceId, t)
      )
    );
  }

  async accountTokenTransfers(address: string): Promise<TokenTransferRecord[]> {
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

export type TokenTransferRecord = {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
};

export type InternalTransactionRecord = {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  input: string;
  type: string;
  gas: string;
  gasUsed: string;
  traceId: string;
  isError: string;
  errCode: string;
};

export type NormalTransactionRecord = {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
};
