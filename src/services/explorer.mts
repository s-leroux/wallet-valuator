import { Swarm } from "../swarm.mjs";
import { ChainRecord } from "../transaction.mjs";
import { Currency } from "../currency.mjs";

/**
 * The high-level interface to explorer a blockchain
 */
export class Explorer {
  readonly chain: string;
  readonly nativeCurrency: Currency;

  constructor(chain: string, nativeCurrency: Currency) {
    this.chain = chain;
    this.nativeCurrency = nativeCurrency;
  }

  register(swarm: Swarm): void {}

  async addressNormalTransactions(
    swarm: Swarm,
    address: string
  ): Promise<Array<ChainRecord>> {
    // OVERRIDE ME
    return [];
  }

  async addressInternalTransactions(
    swarm: Swarm,
    address: string
  ): Promise<Array<ChainRecord>> {
    // OVERRIDE ME
    return [];
  }

  async addressTokenTransfers(
    swarm: Swarm,
    address: string
  ): Promise<Array<ChainRecord>> {
    // OVERRIDE ME
    return [];
  }

  async addressAllTransfers(
    swarm: Swarm,
    address: string
  ): Promise<Array<ChainRecord>> {
    /*
     * Merge {normal, internal, token} transfers in one single list ordered by timestamp.
     */

    // naive implementation
    const [normal, internal, erc20] = await Promise.all([
      this.addressNormalTransactions(swarm, address),
      this.addressInternalTransactions(swarm, address),
      this.addressTokenTransfers(swarm, address),
    ]);

    return normal.concat(internal, erc20);
  }
}

export class CommonExplorer extends Explorer {
  async accountNormalTransactions(address): Promise<Record<string, any>[]> {
    // OVERRIDE ME
    return [];
  }

  async addressNormalTransactions(swarm: Swarm, address: string) {
    const res = await this.accountNormalTransactions(address);

    return res
      .filter((tr) => tr.isError === "0")
      .map((t) => swarm.transaction(this, t.hash, t));
  }

  async accountInternalTransactions(address): Promise<Record<string, any>[]> {
    // OVERRIDE ME
    return [];
  }

  async addressInternalTransactions(
    swarm: Swarm,
    address: string
  ): Promise<Array<ChainRecord>> {
    const res = await this.accountInternalTransactions(address);

    return res
      .filter((tr) => tr.isError === "0")
      .map((t) => swarm.internalTransaction(this, t.hash, t));
  }

  async accountTokenTransfers(address): Promise<Record<string, any>[]> {
    // OVERRIDE ME
    return [];
  }

  async addressTokenTransfers(swarm: Swarm, address: string) {
    const res = await this.accountTokenTransfers(address);

    return res.map((t) => swarm.tokenTransfer(this, t.hash, t));
  }
}
