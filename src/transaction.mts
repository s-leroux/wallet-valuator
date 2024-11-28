const GNOSIS_NATIVE_COIN_DECIMALS = 18;

import { BigNumber, toInteger } from "./bignumber.mjs";
import { Swarm, Storable } from "./swarm.mjs";
import { Explorer } from "./services/explorer.mjs";

type TransactionType =
  | "NORMAL" // a normal transaction
  | "INTERNAL" // an internal transaction
  | "ERC20"; // an ERC-20 token transfer

export class Transaction implements Storable {
  /*
   * Abstract representation of a transfer.
   */
  __id: string;
  readonly explorer;
  readonly hash: string;
  readonly data: object;
  readonly type: TransactionType;

  key: string;

  blockNumber: number;
  timeStamp: number;
  from;
  to;
  contractAddress;
  amount;
  amountAsString;
  unit: string | null;
  symbol: string | null;
  fees;
  feesAsString;

  constructor(
    swarm: Swarm,
    explorer: Explorer,
    hash: string,
    type: TransactionType
  ) {
    this.type = type;
    this.explorer = explorer;
    this.hash = hash;
    this.data = {};
  }
  assign(swarm, data): void {
    Object.assign(this.data, data);

    this.key =
      data.timeStamp.padStart(12) +
      this.explorer.chain +
      data.blockNumber.padStart(12) +
      (data.nonce ?? "0").padStart(10);
    this.blockNumber = toInteger(data.blockNumber);
    this.timeStamp = toInteger(data.timeStamp);

    this.from = swarm.address(this.explorer.chain, data.from);
    this.to = swarm.address(this.explorer.chain, data.to);
    this.contractAddress = data.contractAddress
      ? swarm.address(this.explorer.chain, data.contractAddress)
      : null;

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
  constructor(swarm: Swarm, explorer: Explorer, hash: string) {
    super(swarm, explorer, hash, "NORMAL");
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
  constructor(swarm: Swarm, explorer: Explorer, hash: string) {
    super(swarm, explorer, hash, "INTERNAL");
  }
}

export class ERC20TokenTransfer extends Transaction {
  /**
   * An ERC-20 token transfer;
   */
  constructor(swarm: Swarm, explorer: Explorer, hash: string) {
    super(swarm, explorer, hash, "ERC20");
  }
}
