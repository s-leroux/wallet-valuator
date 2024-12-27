const GNOSIS_NATIVE_COIN_DECIMALS = 18;

import { BigNumber, toInteger } from "./bignumber.mjs";
import { Swarm, Storable } from "./swarm.mjs";
import { Address } from "./address.mjs";
import { Explorer } from "./services/explorer.mjs";
import { Amount } from "./currency.mjs";

type TransactionType =
  | "NORMAL" // a normal transaction
  | "INTERNAL" // an internal transaction
  | "ERC20"; // an ERC-20 token transfer

/**
 * Abstract base class for all blockchain transfers and transactions.
 *
 * Instance of this class or any of it sub-classes should be considered as immutable.
 */

export class ChainRecord {
  readonly explorer: Explorer;
  readonly data: Record<string, string>;
  readonly type: TransactionType;

  // All data below are set to NULL and initialized only when the effective transaction is retrieved
  blockNumber: number;
  timeStamp: number;
  transaction: ChainRecord;
  from: Address;
  to: Address;
  contract: Address;
  amount: Amount;
  fees;
  feesAsString;

  constructor(swarm: Swarm, explorer: Explorer, type: TransactionType) {
    this.type = type;
    this.explorer = explorer;
    this.data = {};
  }

  assign(swarm: Swarm, data): ChainRecord {
    Object.assign(this.data, data);

    this.blockNumber = toInteger(data.blockNumber);
    this.timeStamp = toInteger(data.timeStamp);

    this.from = swarm.address(this.explorer, data.from);
    this.to = swarm.address(this.explorer, data.to);

    if (data.contractAddress) {
      this.contract = swarm.address(this.explorer, data.contractAddress);
      this.contract.assign(swarm, {
        tokenName: data.tokenName,
        tokenSymbol: data.tokenSymbol,
        tokenDecimal: data.tokenDecimal,
      });
    }
    const currency = this.contract?.currency ?? this.explorer.nativeCurrency;

    // EC20 Token code specific
    const value = data.value;
    if (value === undefined) {
      this.amount = currency.fromBaseUnit("0");
    } else {
      this.amount = currency.fromBaseUnit(value);
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

  async load(swarm: Swarm): Promise<NormalTransaction> {
    if (this.timeStamp === undefined) {
      // The transaction data are not already loaded
      return this.explorer.normalTransaction(swarm, this.hash);
    }

    return this;
  }

  assign(swarm: Swarm, data): NormalTransaction {
    super.assign(swarm, data);

    this.isError = this.data.isError && this.data.isError !== "0";

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
  constructor(swarm: Swarm, explorer: Explorer) {
    super(swarm, explorer, "INTERNAL");
  }
}

export class ERC20TokenTransfer extends ChainRecord {
  /**
   * An ERC-20 token transfer;
   */
  constructor(swarm: Swarm, explorer: Explorer) {
    super(swarm, explorer, "ERC20");
  }
}
