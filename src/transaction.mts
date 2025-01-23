const GNOSIS_NATIVE_COIN_DECIMALS = 18;

import { BigNumber, toInteger } from "./bignumber.mjs";
import { Swarm, Storable } from "./swarm.mjs";
import { Address } from "./address.mjs";
import { Explorer } from "./services/explorer.mjs";
import { Amount } from "./cryptoasset.mjs";
import { CryptoResolver } from "./services/cryptoresolver.mjs";

type TransactionType =
  | "NORMAL" // a normal transaction
  | "INTERNAL" // an internal transaction
  | "ERC20"; // an ERC-20 token transfer

/**
 * Abstract base class for all blockchain transfers and transactions.
 *
 * Instance of this class or any of it sub-classes should be considered as immutable.
 */

export abstract class ChainRecord {
  readonly explorer: Explorer;
  readonly data: Record<string, string>;
  readonly type: TransactionType;

  // All data below are set to NULL and initialized only when the effective transaction is retrieved
  blockNumber: number;
  timeStamp: number;
  from: Address;
  to: Address;
  contract: Address;
  amount: Amount;
  fees: BigNumber;
  feesAsString: string;

  constructor(swarm: Swarm, explorer: Explorer, type: TransactionType) {
    this.type = type;
    this.explorer = explorer;
    this.data = {};
  }

  abstract isValid(
    swarm: Swarm,
    cryptoResolver: CryptoResolver
  ): Promise<boolean>;

  assign(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): ChainRecord {
    Object.assign(this.data, data);
    if (!data.blockNumber) {
      console.dir(data);
    }
    this.blockNumber = toInteger(data.blockNumber);
    this.timeStamp = toInteger(data.timeStamp);

    this.from = swarm.address(this.explorer, cryptoResolver, data.from);
    this.to = swarm.address(this.explorer, cryptoResolver, data.to);

    if (data.contractAddress) {
      this.contract = swarm.address(
        this.explorer,
        cryptoResolver,
        data.contractAddress
      );
    }
    const currency = this.contract
      ? cryptoResolver.resolve(
          this.explorer.chain,
          this.blockNumber,
          this.contract.address,
          this.data.tokenName,
          this.data.tokenSymbol,
          toInteger(this.data.tokenDecimal)
        )
      : this.explorer.nativeCurrency;

    if (currency) {
      // EC20 Token code specific
      const value = data.value;
      if (value === undefined) {
        this.amount = currency.fromBaseUnit("0");
      } else {
        this.amount = currency.fromBaseUnit(value);
      }
    }

    const gasPrice = data.gasPrice;
    if (gasPrice === undefined) {
      this.fees = BigNumber.ZERO;
    } else {
      this.fees = BigNumber.fromInteger(gasPrice)
        .mul(data.gasUsed)
        .div(BigNumber.E18);
    }
    this.feesAsString = this.fees.toString();

    return this;
  }
}

export class NormalTransaction extends ChainRecord {
  /**
   * A normal transaction is a a transaction where an Externally Owned Address (EOA) sends
   * ETH directly to another EOA.
   */
  hash: string;
  isError?: boolean;

  constructor(swarm: Swarm, explorer: Explorer, hash: string) {
    super(swarm, explorer, "NORMAL");

    this.hash = hash.toLowerCase();
  }

  async load(
    swarm: Swarm,
    cryptoResolver: CryptoResolver
  ): Promise<NormalTransaction> {
    if (this.timeStamp === undefined) {
      // The transaction data are not already loaded
      return this.explorer.getNormalTransactionByHash(swarm, cryptoResolver, this.hash);
    }

    return this;
  }

  isValid(swarm: Swarm, cryptoResolver: CryptoResolver): Promise<boolean> {
    return this.load(swarm, cryptoResolver).then((tr) => tr.isError === false);
  }

  assign(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): NormalTransaction {
    super.assign(swarm, cryptoResolver, data);

    this.isError = !!this.data.isError && this.data.isError !== "0";

    return this;
  }
}

export class InternalTransaction extends ChainRecord {
  /**
   * Internal transactions are not initiated by a user. Instead, theyare initiated by smart
   * contract code when certain conditions within the contract are met.
   *
   * For internal transactions the Gas is paid for by the original normal transaction that
   * triggered the smart contract.
   */
  isError?: boolean;
  transaction?: NormalTransaction;

  constructor(swarm: Swarm, explorer: Explorer) {
    debugger;
    super(swarm, explorer, "INTERNAL");
  }

  async isValid(
    swarm: Swarm,
    cryptoResolver: CryptoResolver
  ): Promise<boolean> {
    return this.isError === false;
  }

  assign(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): this {
    super.assign(swarm, cryptoResolver, data);

    this.isError = !!this.data.isError && this.data.isError !== "0";
    if (this.transaction === undefined && this.data.hash) {
      this.transaction = swarm.normalTransaction(
        this.explorer,
        cryptoResolver,
        this.data.hash
      );
    }

    return this;
  }
}

export class ERC20TokenTransfer extends ChainRecord {
  /**
   * An ERC-20 token transfer;
   */
  transaction?: NormalTransaction;

  constructor(swarm: Swarm, explorer: Explorer) {
    super(swarm, explorer, "ERC20");
  }

  async isValid(
    swarm: Swarm,
    cryptoResolver: CryptoResolver
  ): Promise<boolean> {
    // It was confirmed by the GnosisScan support that
    // only valid transafers are reported. No need to check
    // for the parent's transaction status
    return this.amount != undefined;
  }

  assign(
    swarm: Swarm,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): this {
    super.assign(swarm, cryptoResolver, data);

    if (this.transaction === undefined && this.data.hash) {
      this.transaction = swarm.normalTransaction(
        this.explorer,
        cryptoResolver,
        this.data.hash
      );
    }

    return this;
  }
}
