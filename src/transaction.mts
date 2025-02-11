const GNOSIS_NATIVE_COIN_DECIMALS = 18;

import { BigNumber, toInteger } from "./bignumber.mjs";
import { Swarm, Storable } from "./swarm.mjs";
import { Address } from "./address.mjs";
import { Explorer } from "./services/explorer.mjs";
import { Amount } from "./cryptoasset.mjs";
import { CryptoResolver } from "./services/cryptoresolver.mjs";
import type { CryptoRegistry } from "./cryptoregistry.mjs";
import { Blockchain } from "./blockchain.mjs";
import { DisplayOptions, tabular, toDisplayString } from "./displayable.mjs";

type TransactionType =
  | "NORMAL" // a normal transaction
  | "INTERNAL" // an internal transaction
  | "ERC20"; // an ERC-20 token transfer

const defaultFormat = tabular(" | ", "", "10", "", "", "");

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

  constructor(swarm: Swarm, chain: Blockchain, type: TransactionType) {
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

  abstract isValid(
    swarm: Swarm,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver
  ): Promise<boolean>;

  async assign(
    swarm: Swarm,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): Promise<ChainRecord> {
    Object.assign(this.data, data);
    if (!data.blockNumber) {
      console.dir(data);
    }
    this.blockNumber = toInteger(data.blockNumber);
    this.timeStamp = toInteger(data.timeStamp);

    this.from = await swarm.address(
      this.explorer.chain,
      registry,
      cryptoResolver,
      data.from
    );
    this.to = await swarm.address(
      this.explorer.chain,
      registry,
      cryptoResolver,
      data.to
    );

    if (data.contractAddress) {
      this.contract = await swarm.address(
        this.explorer.chain,
        registry,
        cryptoResolver,
        data.contractAddress
      );
    }

    // FIXME The logic based on 'currency' seems to be broken (notably in case
    // `resolve` returns `undefined` or `null`)
    const resolution =
      this.contract &&
      (await cryptoResolver.resolve(
        registry,
        this.explorer.chain,
        this.blockNumber,
        this.contract.address,
        this.data.tokenName,
        this.data.tokenSymbol,
        toInteger(this.data.tokenDecimal)
      ));
    const currency = this.contract
      ? resolution && resolution.status === "resolved" && resolution.asset
      : this.explorer.nativeCurrency;

    if (currency) {
      // EC20 Token code specific
      const value = data.value;
      if (value === undefined) {
        this.amount = currency.amountFromBaseUnit("0");
      } else {
        this.amount = currency.amountFromBaseUnit(value);
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

  constructor(swarm: Swarm, chain: Blockchain, hash: string) {
    super(swarm, chain, "NORMAL");

    this.hash = hash.toLowerCase();
  }

  async load(
    swarm: Swarm,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver
  ): Promise<NormalTransaction> {
    if (this.timeStamp === undefined) {
      // The transaction data are not already loaded
      return this.explorer.getNormalTransactionByHash(
        swarm,
        registry,
        cryptoResolver,
        this.hash
      );
    }

    return this;
  }

  isValid(
    swarm: Swarm,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver
  ): Promise<boolean> {
    return this.load(swarm, registry, cryptoResolver).then(
      (tr) => tr.isError === false
    );
  }

  async assign(
    swarm: Swarm,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): Promise<NormalTransaction> {
    super.assign(swarm, registry, cryptoResolver, data);

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

  constructor(swarm: Swarm, chain: Blockchain) {
    debugger;
    super(swarm, chain, "INTERNAL");
  }

  async isValid(
    swarm: Swarm,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver
  ): Promise<boolean> {
    return this.isError === false;
  }

  async assign(
    swarm: Swarm,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): Promise<this> {
    super.assign(swarm, registry, cryptoResolver, data);

    this.isError = !!this.data.isError && this.data.isError !== "0";
    if (this.transaction === undefined && this.data.hash) {
      this.transaction = await swarm.normalTransaction(
        this.explorer.chain,
        registry,
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

  constructor(swarm: Swarm, chain: Blockchain) {
    super(swarm, chain, "ERC20");
  }

  async isValid(
    swarm: Swarm,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver
  ): Promise<boolean> {
    // It was confirmed by the GnosisScan support that
    // only valid transafers are reported. No need to check
    // for the parent's transaction status
    return this.amount != undefined;
  }

  async assign(
    swarm: Swarm,
    registry: CryptoRegistry,
    cryptoResolver: CryptoResolver,
    data: Record<string, any>
  ): Promise<this> {
    super.assign(swarm, registry, cryptoResolver, data);

    if (this.transaction === undefined && this.data.hash) {
      this.transaction = await swarm.normalTransaction(
        this.explorer.chain,
        registry,
        cryptoResolver,
        this.data.hash
      );
    }

    return this;
  }
}
