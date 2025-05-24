import { BigNumber, toInteger } from "./bignumber.mjs";
import { Swarm } from "./swarm.mjs";
import { Address } from "./address.mjs";
import { Explorer } from "./services/explorer.mjs";
import { Amount } from "./cryptoasset.mjs";
import { Blockchain } from "./blockchain.mjs";
import { DisplayOptions, tabular, toDisplayString } from "./displayable.mjs";
import { ValueError } from "./error.mjs";

type OnChainTransactionType =
  | "NORMAL" // a normal transaction
  | "INTERNAL" // an internal transaction
  | "ERC20"; // an ERC-20 token transfer

const defaultFormat = tabular(" | ", "", "10", "", "", "");

/**
 * Abstract base class for all blockchub-classes should be considered as immutable.
 */
export interface Transaction {
  readonly type: string; // RTTI?
  readonly chainName: string;

  readonly timeStamp: number;
  readonly from: { chain: string; address: string };
  readonly to: { chain: string; address: string };

  readonly amount: Amount;
}

export abstract class OnChainTransaction implements Transaction {
  readonly chainName: string;
  readonly explorer: Explorer;
  readonly data: Record<string, string>;
  readonly type: OnChainTransactionType;

  // All data below are set to NULL and initialized only when the effective transaction is retrieved
  blockNumber: number;
  timeStamp: number;
  from: Address;
  to: Address;
  contract: Address;
  amount: Amount; // Transfered amount. In ERC20 toen unit or blockchain native currency
  fees: BigNumber; // fees are always expressed in the blockchain native currency
  feesAsString: string;

  constructor(swarm: Swarm, chain: Blockchain, type: OnChainTransactionType) {
    this.chainName = chain.name;
    this.type = type;
    this.explorer = swarm.getExplorer(chain);
    this.data = {};
  }

  toString(): string {
    return toDisplayString(this);
  }

  toDisplayString(options: DisplayOptions): string {
    const from = this.from.toDisplayString(options);
    const to = this.to.toDisplayString(options);
    const amount = this.amount.toDisplayString(options);

    return (options["record.format"] ?? defaultFormat)(
      this.type[0],
      this.blockNumber,
      from,
      to,
      amount
    );
  }

  abstract isValid(swarm: Swarm): Promise<boolean>;

  async assign(
    swarm: Swarm,
    data: Record<string, any>
  ): Promise<OnChainTransaction> {
    Object.assign(this.data, data);
    if (!data.blockNumber) {
      console.dir(data);
    }
    this.blockNumber = toInteger(data.blockNumber);
    this.timeStamp = toInteger(data.timeStamp);

    this.from = await swarm.address(this.explorer.chain, data.from);
    if (data.to) {
      // The `to` field is empty for a contract creation
      this.to = await swarm.address(this.explorer.chain, data.to);
    }

    if (data.contractAddress) {
      this.contract = await swarm.address(
        this.explorer.chain,
        data.contractAddress
      );
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

export class NormalTransaction extends OnChainTransaction {
  /**
   * A normal transaction is a a transaction where an Externally Owned Address (EOA) sends
   * ETH directly to another EOA.
   */
  hash: string;
  isError?: boolean;

  constructor(swarm: Swarm, chain: Blockchain, hash: string) {
    super(swarm, chain, "NORMAL");

    this.hash = hash.toLowerCase();
  }

  async load(swarm: Swarm): Promise<NormalTransaction> {
    if (this.timeStamp === undefined) {
      // The transaction data are not already loaded
      return this.explorer.getNormalTransactionByHash(swarm, this.hash);
    }

    return this;
  }

  isValid(swarm: Swarm): Promise<boolean> {
    return this.load(swarm).then((tr) => tr.isError === false);
  }

  async assign(
    swarm: Swarm,
    data: Record<string, any>
  ): Promise<NormalTransaction> {
    await super.assign(swarm, data);

    this.isError = !!this.data.isError && this.data.isError !== "0";

    this.amount = this.explorer.nativeCurrency.amountFromBaseUnit(
      data.value ?? "0"
    );

    return this;
  }
}

export class InternalTransaction extends OnChainTransaction {
  /**
   * Internal transactions are not initiated by a user. Instead, theyare initiated by smart
   * contract code when certain conditions within the contract are met.
   *
   * For internal transactions the Gas is paid for by the original normal transaction that
   * triggered the smart contract.
   */
  isError?: boolean;
  transaction?: NormalTransaction;

  constructor(swarm: Swarm, chain: Blockchain) {
    debugger;
    super(swarm, chain, "INTERNAL");
  }

  async isValid(swarm: Swarm): Promise<boolean> {
    return this.isError === false;
  }

  async assign(swarm: Swarm, data: Record<string, any>): Promise<this> {
    await super.assign(swarm, data);

    this.isError = !!this.data.isError && this.data.isError !== "0";

    if (this.transaction === undefined && this.data.hash) {
      this.transaction = await swarm.normalTransaction(
        this.explorer.chain,
        this.data.hash
      );
    }

    this.amount = this.explorer.nativeCurrency.amountFromBaseUnit(
      data.value ?? "0"
    );

    return this;
  }
}

export class ERC20TokenTransfer extends OnChainTransaction {
  /**
   * An ERC-20 token transfer;
   */
  transaction?: NormalTransaction;
  ignore: boolean = false;

  constructor(swarm: Swarm, chain: Blockchain) {
    super(swarm, chain, "ERC20");
  }

  async isValid(swarm: Swarm): Promise<boolean> {
    // It was confirmed by the GnosisScan support that
    // only valid transafers are reported. No need to check
    // for the parent's transaction status
    return this.amount !== undefined && this.ignore === false;
  }

  async assign(swarm: Swarm, data: Record<string, any>): Promise<this> {
    await super.assign(swarm, data);

    if (this.transaction === undefined && this.data.hash) {
      this.transaction = await swarm.normalTransaction(
        this.explorer.chain,
        this.data.hash
      );
    }

    if (!this.contract) {
      throw new ValueError(
        `The contract must be defined in an ERC20 token tranfer (was ${this.contract}`
      );
    }

    const resolution = await swarm.resolve(
      this.explorer.chain,
      this.blockNumber,
      this.contract.address,
      this.data.tokenName,
      this.data.tokenSymbol,
      toInteger(this.data.tokenDecimal)
    );

    if (!resolution) {
      throw new ValueError(
        `Unable to resolve the ERC20 token ${this.data.tokenName} (${this.data.tokenSymbol})`
      );
    }

    switch (resolution.status) {
      case "obsolete":
      case "ignore":
        this.ignore = true;
        break;
      case "resolved":
        this.amount = resolution.asset.amountFromBaseUnit(data.value ?? "0");
        break;
    }

    return this;
  }
}
