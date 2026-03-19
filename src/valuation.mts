import {
  AssertionError,
  InconsistentUnitsError,
  MissingPriceError,
  ProtocolError,
} from "./error.mjs";
import {
  BigNumberSource,
  Fixed,
  fixedFromSource,
  FixedSource,
} from "./bignumber.mjs";
import { FiatCurrency } from "./fiatcurrency.mjs";
import { CryptoMetadata, CryptoRegistryNG } from "./cryptoregistry.mjs";
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
import { PriceResolver } from "./priceresolver.mjs";
const log = logger("valuation");

//======================================================================
//  Value
//======================================================================

type ValueSource = BigNumberSource | FixedSource;

/**
 * Represents a monetary value in a specific fiat currency.
 *
 * The Value class encapsulates an amount of fiat currency (e.g. USD, EUR) backed by `Fixed`
 * for precise decimal arithmetic. It provides methods for basic arithmetic operations
 * while ensuring currency consistency.
 *
 * @example
 * const usdValue = new Value(FiatCurrency("USD"), Fixed.from(100n));
 * const eurValue = new Value(FiatCurrency("EUR"), Fixed.from(85n));
 * // usdValue.plus(eurValue) // Throws InconsistentUnitsError
 *
 * FIXED Unify that class with `Amount` usign generics.
 * FIXED This was fixed when `Quantity` was implemented.
 */
export class Value {
  readonly fiatCurrency: FiatCurrency;
  readonly value: Fixed;

  constructor(fiatCurrency: FiatCurrency, value: ValueSource = Fixed.ZERO) {
    this.fiatCurrency = fiatCurrency;
    this.value = fixedFromSource(value);
  }

  /**
   * Creates a Value instance from a fiat currency identifier and numeric value.
   * Handles both string currency codes and FiatCurrency objects.
   *
   * @param fiat - The fiat currency identifier (string code or FiatCurrency object)
   * @param value - The numeric value to create the Value instance with
   * @returns A new Value instance
   */
  static from(fiat: string | FiatCurrency, value: ValueSource) {
    return new Value(FiatCurrency(fiat), value);
  }

  /**
   * Fiat currency addition.
   *
   * Both the receiver and the argument must be expressed in the same fiat currency.
   * The result is expressed at the scale of the highest-scale operand.
   *
   * @param other - The other Value to add to the receiver.
   * @returns A new Value representing the sum of the receiver and the argument.
   */
  plus(other: Value) {
    if (this.fiatCurrency != other.fiatCurrency) {
      throw new InconsistentUnitsError(this.fiatCurrency, other.fiatCurrency);
    }

    return new Value(this.fiatCurrency, this.value.plus(other.value));
  }

  /**
   * Fiat currency subtraction.
   *
   * Both the receiver and the argument must be expressed in the same fiat currency.
   * The result is expressed at the scale of the highest-scale operand.
   *
   * @param other - The other Value to subtract from the receiver.
   * @returns A new Value representing the difference between the receiver and the argument.
   */
  minus(other: Value) {
    if (this.fiatCurrency != other.fiatCurrency) {
      throw new InconsistentUnitsError(this.fiatCurrency, other.fiatCurrency);
    }

    return new Value(this.fiatCurrency, this.value.minus(other.value));
  }

  /**
   * Returns a new value representing this value scaled by a given factor.
   *
   * Result is rescaled to the receiver's scale.
   *
   * Quantization policy:
   * - multiplication is computed in fixed-point arithmetic,
   * - then truncated to the receiver scale (via `Fixed.mul(..., this.value.scale)`),
   * - so this operation is stable in value domains where amounts are represented
   *   with a fixed number of decimals (e.g. fiat cents).
   */
  scaledBy(factor: ValueSource): Value {
    const factorFixed = fixedFromSource(factor);
    return new Value(
      this.fiatCurrency,
      this.value.mul(factorFixed, this.value.scale),
    );
  }

  /**
   * Returns the scalar ratio between this value and a base value (this / other).
   *
   * The returned scalar is expressed at the receiver's scale.
   *
   * Quantization policy:
   * - division uses `Fixed.div(..., this.value.scale)`,
   * - the quotient is therefore truncated toward zero at the receiver scale.
   *
   * This intentionally aligns with `scaledBy()` for pipeline formulas such as
   * `share = cashOut.relativeTo(total)` followed by `cashIn.scaledBy(share)`.
   */
  relativeTo(other: Value): Fixed {
    if (this.fiatCurrency != other.fiatCurrency) {
      throw new InconsistentUnitsError(this.fiatCurrency, other.fiatCurrency);
    }
    return this.value.div(other.value, this.value.scale);
  }

  isZero() {
    return this.value.isZero();
  }

  toString(): string {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
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
      this.fiatCurrency.code,
    )}`;
  }

  negated(): Value {
    return new Value(this.fiatCurrency, this.value.negated());
  }
}

//======================================================================
//  Position
//======================================================================

/**
 * An amount of crypto-asset and its counterpart value in a given fiat currency.
 */
type Position = {
  amount: Amount;
  value: Value;
};

//======================================================================
//  PointInTimeValuation
//======================================================================

/**
 * A portfolio value at a given point-in-time.
 *
 * ISSUE #130 We should rename PointInTimeValuation to SnapshotValuation but
 * for historical reasons that later has inherited a (now) wrong name.
 */
export class PointInTimeValuation {
  readonly totalCryptoValue: Value;

  private constructor(
    readonly date: Date,
    readonly fiatCurrency: FiatCurrency,
    readonly positions: Map<CryptoAsset, Position>,
  ) {
    let totalCryptoValue = new Value(fiatCurrency);
    for (const position of positions.values()) {
      totalCryptoValue = totalCryptoValue.plus(position.value);
    }
    this.totalCryptoValue = totalCryptoValue;
  }

  /**
   * Create a new PointInTimeValuation.
   *
   * This assumes the following pre-requiites:
   * 1. All fiat values are expressed in the sage (given) fiat currency
   * 2. All crypto-assets unit price are available in the `exchangeRate` mapping.
   * @param date
   * @param fiatCurrency
   * @param amounts
   * @param exchangeRates
   */
  static create(
    date: Date,
    fiatCurrency: FiatCurrency,
    amounts: Map<CryptoAsset, Amount>,
    exchangeRates: Map<CryptoAsset, Price>,
  ) {
    const positions = new Map<CryptoAsset, Position>();

    amounts.forEach((amount, cryptoAsset) => {
      const exchangeRate = exchangeRates.get(cryptoAsset);
      if (exchangeRate === undefined) {
        throw new ProtocolError(`Missing  exchange rate for ${cryptoAsset}`);
      }

      if (exchangeRate.fiatCurrency !== fiatCurrency) {
        throw new InconsistentUnitsError(
          exchangeRate.fiatCurrency,
          fiatCurrency,
        );
      }

      positions.set(cryptoAsset, {
        amount,
        value: amount.valueAt(exchangeRate),
      });
    });

    return new PointInTimeValuation(date, fiatCurrency, positions);
  }
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
  private constructor(
    readonly fiatCurrency: FiatCurrency,
    readonly date: Date,
    readonly cryptoValueBefore: PointInTimeValuation,
    readonly cryptoValueAfter: PointInTimeValuation,
    readonly tags: Map<string, unknown>,
    readonly comments: string[],
    readonly fiatDeposits: Value,
    readonly fiscalCash: Value, // The "cash-in" according to the French fiscal rules
    readonly cashInMulShare: Value | undefined, // The share of initial capital according to the French fiscal rules
    readonly gainOrLoss: Value | undefined,
    readonly parent: SnapshotValuation | null,
  ) {}

  static async createFromSnapshot(
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    priceResolver: PriceResolver,
    fiatCurrency: FiatCurrency,
    snapshot: Snapshot,
    parent: SnapshotValuation | null,
  ): Promise<SnapshotValuation> {
    const date = new Date(snapshot.timeStamp * 1000);

    const currentHoldings = snapshot.holdings;
    const previousHoldings =
      snapshot.parent?.holdings ?? new Map<CryptoAsset, Amount>();

    // Helper function
    async function getPrice(crypto: CryptoAsset): Promise<Price> {
      const metadata = cryptoMetadata.getMetadata(crypto);
      if (metadata?.fiscalCategory === "SECURITY") {
        // SECURITY tokens have no fiscal price
        return crypto.price(fiatCurrency, 0); // ISSUE #131 Is this correct
      }
      // This is a regular crypto-asset. Use the oracle to get the price.
      const prices = await priceResolver.getPrice(
        cryptoRegistry,
        cryptoMetadata,
        crypto,
        date,
        new Set([fiatCurrency]),
      );

      const price = prices.get(fiatCurrency);
      if (price === undefined) {
        // ISSUE #135 This is very unlikely since Priceresolver throws if a price is not found
        // prettier-ignore
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const message = `Can't price ${crypto.symbol }/${fiatCurrency} at ${date.toISOString()}`;
        log.warn("C3001", message, cryptoMetadata.getMetadata(crypto), prices);
        throw new MissingPriceError(crypto, fiatCurrency, date);
      }

      return price;
    }

    // Pre-load all the required prices. This could be parallelized.
    const exchangeRates = new Map<CryptoAsset, Price>();

    async function loadExchangeRates(list: Iterable<CryptoAsset>) {
      for (const crypto of snapshot.holdings.keys()) {
        if (!exchangeRates.has(crypto)) {
          exchangeRates.set(crypto, await getPrice(crypto));
        }
      }
    }

    await loadExchangeRates(currentHoldings.keys());
    await loadExchangeRates(previousHoldings.keys());

    // Evaluate each individual holdings
    const start = PointInTimeValuation.create(
      date,
      fiatCurrency,
      previousHoldings,
      exchangeRates,
    );
    const end = PointInTimeValuation.create(
      date,
      fiatCurrency,
      currentHoldings,
      exchangeRates,
    );

    // Copy auxiliary data
    const tags = new Map<string, unknown>(
      snapshot.tags as Map<string, unknown>,
    );
    const comments = snapshot.comments;

    // Track cash movements
    let deposits = parent ? parent.fiatDeposits : new Value(fiatCurrency);
    let cashIn = parent ? parent.fiscalCash : new Value(fiatCurrency);
    let gainOrLoss: Value | undefined;
    let cashInMulShare: Value | undefined;

    if (tags.get("CASH-IN") && tags.get("CASH-OUT")) {
      const message = `A transaction cannot be CASH-IN and CASH-OUT at the same time`;
      log.error("C3008", message, snapshot);
      throw new AssertionError(message);
    } else if (tags.get("CASH-IN")) {
      // Simple case—just add to the currect cash value
      const delta = end.totalCryptoValue.minus(start.totalCryptoValue); // This is supposed to be positive
      deposits = deposits.plus(delta);
      cashIn = cashIn.plus(delta);
    } else if (tags.get("CASH-OUT")) {
      const cashOut = start.totalCryptoValue.minus(end.totalCryptoValue); // This is supposed to be positive too !!!
      deposits = deposits.minus(cashOut);

      // Specific French accounting formula (2025)
      // see https://www.waltio.com/fr/comment-calculer-impots-crypto/
      //
      // Fixed-point expectation:
      // - `share` is quantized at `cashOut` scale and truncated toward zero.
      // - `cashInMulShare` is then quantized at `cashIn` scale.
      // This keeps the fiscal pipeline deterministic across runs and avoids
      // accidental precision growth from intermediate operations.
      const share = cashOut.relativeTo(start.totalCryptoValue); // positive
      cashInMulShare = cashIn.scaledBy(share);
      gainOrLoss = cashOut.minus(cashInMulShare);
      cashIn = cashIn.minus(cashInMulShare); // same as cashIn * (1 - share)
    }

    // All done. Create the instance.
    return new SnapshotValuation(
      fiatCurrency,
      date,
      start,
      end,
      tags,
      comments,
      deposits,
      cashIn,
      cashInMulShare,
      gainOrLoss,
      parent,
    );
  }

  //========================================================================
  //  String representation
  //========================================================================
  toString(): string {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
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
    lines.push(
      "V:" + this.cryptoValueAfter.totalCryptoValue.toDisplayString(options),
    );

    // Now our holdings
    this.cryptoValueAfter.positions.forEach(
      ({ value, amount }, cryptoAsset) => {
        if (!value.isZero()) {
          lines.push(
            "  " +
              value.toDisplayString(options) +
              " " +
              amount.toDisplayString(options),
          );
        }
      },
    );

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
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    oracle: Oracle,
    fiatConverter: FiatConverter,
    fiatCurrency: FiatCurrency,
    snapshots: Snapshot[],
  ): Promise<PortfolioValuation> {
    const snapshotValuations = [] as SnapshotValuation[];

    // we need a bit of serialization here to keep track of the deposits
    let curr: SnapshotValuation | null = null;
    const priceResolver = new PriceResolver(oracle, fiatConverter);
    for (const snapshot of snapshots) {
      curr = await SnapshotValuation.createFromSnapshot(
        cryptoRegistry,
        cryptoMetadata,
        priceResolver,
        fiatCurrency,
        snapshot,
        curr,
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
