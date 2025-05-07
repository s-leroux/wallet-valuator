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

export class Value {
  constructor(readonly fiatCurrency: FiatCurrency, readonly value: BigNumber) {}

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

export function valueFromAmountAndPrice(amount: Amount, price: Price): Value {
  if (amount.crypto !== price.crypto) {
    throw new InconsistentUnitsError(amount.crypto, price.crypto);
  }
  return new Value(price.fiatCurrency, BigNumber.mul(amount.value, price.rate));
}

/**
 * Represents the valuation of a set of crypto-assets
 * in terms of a specified fiat currency at a specific point in time.
 */
export class SnapshotValuation {
  readonly fiatCurrency: FiatCurrency;
  readonly timeStamp: number;
  readonly holdings: Map<Amount, Value>;
  readonly deposits: Value;
  readonly tags: Map<string, any>;
  readonly totalValue: Value;

  private constructor(
    fiatCurrency: FiatCurrency,
    timeStamp: number,
    holdings: Map<Amount, Value>,
    deposits: Value,
    tags: Map<string, any>
  ) {
    this.fiatCurrency = fiatCurrency;
    this.timeStamp = timeStamp;
    this.holdings = holdings;
    this.deposits = deposits;
    this.tags = tags;

    let acc = new Value(fiatCurrency, BigNumber.ZERO);
    for (const value of holdings.values()) {
      acc = acc.plus(value); // FIX #33 It is unclear if totalValue should be a BigNumber or a Value
    }
    this.totalValue = acc;
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
      rates.set(crypto, await getPrice(crypto));
    }

    // We have all the prices now. Calculate our holdings.
    const holdings = new Map<Amount, Value>();
    for (const [crypto, amount] of snapshot.holdings) {
      const value = valueFromAmountAndPrice(amount, rates.get(crypto)!);
      holdings.set(amount, value);
    }

    // Copy tags
    const tags = new Map<string, any>(snapshot.tags);

    // Get the actual deposits
    let deposits = parent
      ? parent.deposits
      : new Value(fiatCurrency, BigNumber.ZERO);

    // Handle the INGRESS/EGRESS tags
    const ingress = tags.get("INGRESS");
    const egress = tags.get("EGRESS");
    const amount = ingress ? ingress : egress ? egress : null;
    if (amount) {
      if (!rates.has(amount.crypto)) {
        rates.set(amount.crypto, await getPrice(amount.crypto));
      }

      // Calculate the delta deposit
      const delta = valueFromAmountAndPrice(amount, rates.get(amount.crypto)!);

      if (tags.get("RAMP-UP")) {
        // XXX CASH-IN
        deposits = deposits.plus(delta);
      } else if (tags.get("RAMP-DOWN")) {
        // XXX CASH-OUT
        deposits = deposits.minus(delta);
      }
    }

    // All done. Create the instance.
    return new SnapshotValuation(
      fiatCurrency,
      snapshot.timeStamp,
      holdings,
      deposits,
      tags
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
    return `${this.totalValue} ${this.fiatCurrency}`;
  }

  toDisplayString(options: DisplayOptions = {}): string {
    const lines: string[] = [
      TextUtils.formatDate(this.timeStamp * 1000, options),
    ];

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
    lines.push("D:" + this.deposits.toDisplayString(options));

    // Add a line for the total valuation
    lines.push("V:" + this.totalValue.toDisplayString(options));

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

export class PortfolioValuation {
  readonly snapshotValuations: SnapshotValuation[];

  //========================================================================
  //  Construction
  //========================================================================
  constructor(snapshotValuations: SnapshotValuation[]) {
    this.snapshotValuations = snapshotValuations;
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
