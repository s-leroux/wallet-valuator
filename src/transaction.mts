const GNOSIS_NATIVE_COIN_DECIMALS = 18;

import { BigNumber, toInteger } from "./bignumber.mjs";
import { Swarm } from "./swarm.mjs";

type TransactionType =
  | "NORMAL" // a normal transaction
  | "INTERNAL" // an internal transaction
  | "ERC20"; // an ERC-20 token transfer

export class Transaction {
  /*
   * Abstract representation of a transfer.
   */
  readonly type: TransactionType;
  readonly key: string;
  readonly blockNumber: number;
  readonly timeStamp: number;
  readonly from;
  readonly to;
  readonly contractAddress;
  readonly amount;
  readonly amountAsString;
  readonly unit: string | null;
  readonly symbol: string | null;
  readonly fees;
  readonly feesAsString;
  readonly data: object;

  constructor(swarm: Swarm, chain: string, type: TransactionType, data) {
    this.type = type;
    this.key =
      data.timeStamp.padStart(12) +
      chain +
      data.blockNumber.padStart(12) +
      (data.nonce ?? "0").padStart(10);
    this.data = data;
    this.blockNumber = toInteger(data.blockNumber);
    this.timeStamp = toInteger(data.timeStamp);

    this.from = swarm.address(chain, data.from);
    this.to = swarm.address(chain, data.to);
    this.contractAddress = swarm.address(chain, data.contractAddress);

    const value = data.value;
    if (value === undefined) {
      this.amount = BigNumber.ZERO;
    } else {
      const decimal = data.tokenBigNumber ?? GNOSIS_NATIVE_COIN_DECIMALS;

      this.amount = BigNumber.fromDigits(value, decimal);
      this.amountAsString = this.amount.toString(); // Mostly for testing purposes
    }

    this.unit = data.tokenName ?? null;
    this.symbol = data.tokenSymbol ?? null;

    const gasPrice = data.gasPrice;
    if (gasPrice === undefined) {
      this.fees = BigNumber.ZERO;
    } else {
      this.fees = BigNumber.fromInteger(gasPrice)
        .mul(data.gasUsed)
        .div(BigNumber.E18);
    }
    this.feesAsString = this.fees.toString();
  }
}

export class NormalTransaction extends Transaction {
  /**
   * A normal transaction is a a transaction where an Externally Owned Address (EOA) sends
   * ETH directly to another EOA.
   */
  constructor(swarm: Swarm, chain: string, data) {
    super(swarm, chain, "NORMAL", data);
  }
}

export class InternalTransaction extends Transaction {
  /**
   * Internal transactions are not initiated by a user. Instead, theyare initiated by smart
   * contract code when certain conditions within the contract are met.
   *
   * For internal transactions the Gas is paid for by the original normal transaction that
   * triggered the smart contract.
   */
  constructor(swarm: Swarm, chain: string, data) {
    super(swarm, chain, "INTERNAL", data);
  }
}

export class ERC20TokenTransfer extends Transaction {
  /**
   * An ERC-20 token transfer;
   */
  constructor(swarm: Swarm, chain: string, data) {
    super(swarm, chain, "ERC20", data);
  }
}
