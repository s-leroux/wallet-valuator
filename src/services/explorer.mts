import { Swarm } from "../swarm.mjs";
import { NotImplementedError } from "../error.mjs";
import { ChainRecord, NormalTransaction } from "../transaction.mjs";
import { CryptoAsset } from "../cryptoasset.mjs";
import { CryptoResolver } from "./cryptoresolver.mjs";

/**
 * The high-level interface to explorer a blockchain
 */
export class Explorer {
  readonly chain: string;
  readonly nativeCurrency: CryptoAsset;

  constructor(chain: string, nativeCurrency: CryptoAsset) {
    this.chain = chain;
    this.nativeCurrency = nativeCurrency;
  }

  register(swarm: Swarm, cryptoResolver: CryptoResolver): void {}

  async normalTransaction(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    txhash: string
  ): Promise<NormalTransaction> {
    // OVERRIDE ME
    throw new NotImplementedError();
  }

  async addressNormalTransactions(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    address: string
  ): Promise<Array<NormalTransaction>> {
    // OVERRIDE ME
    return [];
  }

  async addressInternalTransactions(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    address: string
  ): Promise<Array<ChainRecord>> {
    // OVERRIDE ME
    return [];
  }

  async addressTokenTransfers(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    address: string
  ): Promise<Array<ChainRecord>> {
    // OVERRIDE ME
    return [];
  }

  async addressAllValidTransfers(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    address: string
  ): Promise<Array<ChainRecord>> {
    const allTransfers = await this.addressAllTransfers(
      swarm,
      cryptoResolver,
      address
    );
    const selection = await Promise.all(
      allTransfers.map((tr) => tr.isValid(swarm, cryptoResolver))
    );

    return allTransfers.filter((_, index) => selection[index]);
  }

  /**
   * Return all the transfers involving a given address.
   *
   * You probably *don't* want to use this function but `addressAllValidTransfers` instead.
   */
  async addressAllTransfers(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    address: string
  ): Promise<Array<ChainRecord>> {
    /*
     * Merge {normal, internal, token} transfers in one single list ordered by timestamp.
     */

    // naive implementation
    const [normal, internal, erc20] = await Promise.all([
      this.addressNormalTransactions(swarm, cryptoResolver, address),
      this.addressInternalTransactions(swarm, cryptoResolver, address),
      this.addressTokenTransfers(swarm, cryptoResolver, address),
    ]);
    const result: ChainRecord[] = [];

    return result.concat(normal, internal, erc20);
  }
}

export class CommonExplorer extends Explorer {
  async accountNormalTransactions(
    address: string
  ): Promise<Record<string, any>[]> {
    // OVERRIDE ME
    return [];
  }

  async addressNormalTransactions(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    address: string
  ) {
    const res = await this.accountNormalTransactions(address);

    return res
      .map((t) => swarm.normalTransaction(this, cryptoResolver, t.hash, t))
      .filter((t) => t.data.isError === "0");
  }

  async accountInternalTransactions(
    address: string
  ): Promise<Record<string, any>[]> {
    // OVERRIDE ME
    return [];
  }

  async addressInternalTransactions(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    address: string
  ): Promise<Array<ChainRecord>> {
    const res = await this.accountInternalTransactions(address);

    return res.map((t) => swarm.internalTransaction(this, cryptoResolver, t));
  }

  async accountTokenTransfers(address: string): Promise<Record<string, any>[]> {
    // OVERRIDE ME
    return [];
  }

  async addressTokenTransfers(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    address: string
  ) {
    const res = await this.accountTokenTransfers(address);

    return res.map((t) => swarm.tokenTransfer(this, cryptoResolver, t));
  }
}
