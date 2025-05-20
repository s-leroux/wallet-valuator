import { InconsistentUnitsError, MissingPriceError } from "./error.mjs";
import { BigNumber } from "./bignumber.mjs";
import type { FiatCurrency } from "./fiatcurrency.mjs";
import type { CryptoRegistry } from "./cryptoregistry.mjs";
import { CryptoAsset, type Amount } from "./cryptoasset.mjs";
import type { Price } from "./price.mjs";
import type { Oracle } from "./services/oracle.mjs";
import type { FiatConverter } from "./services/fiatconverter.mjs";
import {
  defaultDisplayOptions,
  DisplayOptions,
  TextUtils,
  toDisplayString,
} from "./displayable.mjs";
import { Snapshot } from "./portfolio.mjs";

import { logger as logger } from "./debug.mjs";
const log = logger("provider");

//======================================================================
//  Value
//======================================================================

/**
 * Represents a monetary value in a specific fiat currency.
 *
 * The Value class encapsulates an amount of fiat currency (e.g. USD, EUR) backed by BigNumber
 * for precise decimal arithmetic. It provides methods for basic arithmetic operations
 * while ensuring currency consistency.
 *
 * @example
 * const usdValue = new Value(FiatCurrency("USD"), BigNumber.from(100));
 * const eurValue = new Value(FiatCurrency("EUR"), BigNumber.from(85));
 * // usdValue.plus(eurValue) // Throws InconsistentUnitsError
 *
 * XXX Unify that class with `Amount` usign generics.
 */
export class Value {
  constructor(
    readonly fiatCurrency: FiatCurrency,
    readonly value: BigNumber = BigNumber.ZERO
  ) {}

  plus(other: Value) {
    if (this.fiatCurrency != other.fiatCurrency) {
      throw new InconsistentUnitsError(this.fiatCurrency, other.fiatCurrency);
    }

    return new Value(this.fiatCurrency, this.value.plus(other.value));
  }

  minus(other: Value) {
    if (this.fiatCurrency != other.fiatCurrency) {
      throw new InconsistentUnitsError(this.fiatCurrency, other.fiatCurrency);
    }

    return new Value(this.fiatCurrency, this.value.minus(other.value));
  }

  isZero() {
    return this.value.isZero();
  }

  toString(): string {
    return `${this.value} ${this.fiatCurrency}`;
  }

  toDisplayString(options: DisplayOptions): string {
    const valueFormat =
      options["amount.value.format"] ??
      defaultDisplayOptions["amount.value.format"];
    const symbolFormat =
      options["amount.symbol.format"] ??
      defaultDisplayOptions["amount.symbol.format"];
    const sep =
      options["amount.separator"] ?? defaultDisplayOptions["amount.separator"];

    return `${valueFormat(this.value.toString())}${sep}${symbolFormat(
      this.fiatCurrency
    )}`;
  }
}

//======================================================================
//  Helpers
//======================================================================

export function valueFromAmountAndPrice(amount: Amount, price: Price): Value {
  if (amount.crypto !== price.crypto) {
    throw new InconsistentUnitsError(amount.crypto, price.crypto);
  }
  return new Value(price.fiatCurrency, BigNumber.mul(amount.value, price.rate));
}

//======================================================================
//  SnapshotValuation
//======================================================================

/**
 * Represents a valuation of a portfolio over a period of time.
 *
 * A SnapshotValuation tracks how the portfolio value has changed between two
 * points in time. It stores the state of the portfolio "before" and "after"
 * one or more movements (ingress/egress of tokens). This design aligns with
 * real-world use cases like fiscal reporting or historical analysis.
 *
 * Unlike `Snapshot`, which represents a point-in-time view of the portfolio's
 * contents, a SnapshotValuation expresses a delta: the evolution in total
 * value (in a given fiat currency) and possibly the change in invested capital
 * during that time.
 *
 * SnapshotValuations are often derived from one or more `Snapshot` instances,
 * but are intentionally more abstract and can be used to group multiple
 * movements into broader reporting periods (e.g. per day or per week).
 *
 * This class does not aim to record individual transactions or zero-sum moves.
 * It prioritizes tracking net changes in value and investment for reporting
 * purposes.
 */
export class SnapshotValuation {
  readonly cryptoValueBefore: Value;
  readonly cryptoValueAfter: Value;

  private constructor(
    readonly fiatCurrency: FiatCurrency,
    readonly date: Date,
    readonly rates: Map<CryptoAsset, Price>,
    readonly holdings: Map<Amount, Value>,
    readonly tags: Map<string, any>,
    readonly fiatDeposits: Value,
    readonly parent: SnapshotValuation | null
  ) {
    let cryptoValueAfter = new Value(fiatCurrency);
    for (const value of holdings.values()) {
      cryptoValueAfter = cryptoValueAfter.plus(value);
    }
    this.cryptoValueAfter = cryptoValueAfter;

    let cryptoValueBefore = new Value(fiatCurrency);
    if (parent) {
      for (const value of parent.holdings.values()) {
        cryptoValueBefore = cryptoValueBefore.plus(value);
      }
    }
    this.cryptoValueBefore = cryptoValueBefore;
  }

  static async createFromSnapshot(
    registry: CryptoRegistry,
    oracle: Oracle,
    fiatConverter: FiatConverter,
    fiatCurrency: FiatCurrency,
    snapshot: Snapshot,
    parent: SnapshotValuation | null
  ): Promise<SnapshotValuation> {
    const date = new Date(snapshot.timeStamp * 1000);

    // Helper function
    async function getPrice(crypto: CryptoAsset): Promise<Price> {
      const standardMetadata = registry.getNamespaceData(crypto, "STANDARD");
      if (standardMetadata?.fiscalCategory === "SECURITY") {
        // SECURITY tokens have no fiscal price
        return crypto.price(fiatCurrency, 0); // XXX Is this correct
      }
      // This is a regular crypto-asset. Use the oracle to get the price.
      const prices = await oracle.getPrice(
        registry,
        crypto,
        date,
        [fiatCurrency],
        fiatConverter
      );

      const price = prices[fiatCurrency];
      if (price === undefined) {
        // prettier-ignore
        const message = `Can't price ${crypto.symbol }/${fiatCurrency} at ${date.toISOString()}`;

        log.warn("C3001", message, registry.getNamespaces(crypto));

        throw new MissingPriceError(crypto, fiatCurrency, date);
      }

      return price;
    }

    // Pre-load all the required prices. This could be parallelized.
    const rates = new Map<CryptoAsset, Price>();
    for (const crypto of snapshot.holdings.keys()) {
      if (!rates.has(crypto)) {
        rates.set(crypto, await getPrice(crypto));
      }
    }

    // Evaluate each individual holdings
    const holdings = new Map<Amount, Value>();
    for (const [crypto, amount] of snapshot.holdings) {
      const value = valueFromAmountAndPrice(amount, rates.get(crypto)!);
      holdings.set(amount, value);
    }

    // Copy tags
    const tags = new Map<string, any>(snapshot.tags);

    // update cash deposits
    let deposits = parent ? parent.fiatDeposits : new Value(fiatCurrency);

    // Handle the DELTA tag
    const delta = tags.get("DELTA") as Amount;
    if (delta && (tags.get("CASH-IN") || tags.get("CASH-OUT"))) {
      let rate = rates.get(delta.crypto);
      if (!rate) {
        // XXX This is unexpected. We should at least log that.
        rate = await getPrice(delta.crypto);
        rates.set(delta.crypto, rate);
      }

      deposits = deposits.plus(valueFromAmountAndPrice(delta, rate));
    }

    // All done. Create the instance.
    return new SnapshotValuation(
      fiatCurrency,
      date,
      rates,
      holdings,
      tags,
      deposits,
      parent
    );
  }

  get(crypto: CryptoAsset): Value {
    for (const [amount, value] of this.holdings) {
      if (amount.crypto === crypto) {
        return value;
      }
    }
    return new Value(this.fiatCurrency, BigNumber.ZERO);
  }

  //========================================================================
  //  String representation
  //========================================================================
  toString(): string {
    return `${this.cryptoValueAfter} ${this.fiatCurrency}`;
  }

  toDisplayString(options: DisplayOptions = {}): string {
    const lines: string[] = [TextUtils.formatDate(this.date, options)];

    // Add a line for the tags
    if (this.tags.size) {
      const tags = [] as string[];
      for (const [key, value] of this.tags) {
        if (value !== true) {
          tags.push(`${key}=${toDisplayString(value, options)}`);
        } else {
          tags.push(String(key));
        }
      }
      lines.push(tags.join(" "));
    }

    // Add a line for the total deposit
    lines.push("D:" + this.fiatDeposits.toDisplayString(options));

    // Add a line for the total valuation
    lines.push("V:" + this.cryptoValueAfter.toDisplayString(options));

    // Now our holdings
    this.holdings.forEach((value, amount) => {
      if (!value.isZero()) {
        lines.push(
          "  " +
            value.toDisplayString(options) +
            " " +
            amount.toDisplayString(options)
        );
      }
    });

    return lines.join("\n");
  }
}

export class PortfolioValuation implements Iterable<SnapshotValuation> {
  readonly snapshotValuations: SnapshotValuation[];

  //========================================================================
  //  Construction
  //========================================================================
  constructor(snapshotValuations: SnapshotValuation[]) {
    this.snapshotValuations = snapshotValuations;
  }
  [Symbol.iterator](): Iterator<SnapshotValuation> {
    return this.snapshotValuations[Symbol.iterator]();
  }

  static async create(
    registry: CryptoRegistry,
    oracle: Oracle,
    fiatConverter: FiatConverter,
    fiatCurrency: FiatCurrency,
    snapshots: Snapshot[]
  ): Promise<PortfolioValuation> {
    const snapshotValuations = [] as SnapshotValuation[];

    // we need a bit of serialization here to keep track of the deposits
    let curr: SnapshotValuation | null = null;
    for (const snapshot of snapshots) {
      curr = await SnapshotValuation.createFromSnapshot(
        registry,
        oracle,
        fiatConverter,
        fiatCurrency,
        snapshot,
        curr
      );
      snapshotValuations.push(curr);
    }

    return new PortfolioValuation(snapshotValuations);
  }

  //========================================================================
  //  String representation
  //========================================================================
  toString() {
    const head = "PortfolioValuation([";
    const tail = "])";
    const body = TextUtils.indent(this.snapshotValuations.map(String));
    if (body) {
      return `${head}\n${body}\n${tail}`;
    }

    return `${head}${tail}`;
  }

  toDisplayString(options: DisplayOptions = {}) {
    return this.snapshotValuations
      .map((snapshot) => snapshot.toDisplayString(options))
      .join("\n");
  }
}
