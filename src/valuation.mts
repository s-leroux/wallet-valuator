import { InconsistentUnitsError, MissingPriceError } from "./error.mjs";
import { BigNumber } from "./bignumber.mjs";
import type { FiatCurrency } from "./fiatcurrency.mjs";
import type { CryptoAsset } from "./cryptoasset.mjs";
import type { CryptoRegistry } from "./cryptoregistry.mjs";
import type { Amount } from "./cryptoasset.mjs";
import type { Price } from "./price.mjs";
import type { Oracle } from "./services/oracle.mjs";
import type { FiatConverter } from "./services/fiatconverter.mjs";
import {
  defaultDisplayOptions,
  DisplayOptions,
  TextUtils,
} from "./displayable.mjs";
import { Snapshot } from "./portfolio.mjs";

import { logger as logger } from "./debug.mjs";
const log = logger("provider");

export class Value {
  constructor(readonly fiatCurrency: FiatCurrency, readonly value: BigNumber) {}

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
  readonly holdings: Map<CryptoAsset, Value>;
  readonly totalValue: BigNumber;

  private constructor(
    fiatCurrency: FiatCurrency,
    timeStamp: number,
    holdings: Map<CryptoAsset, Value>
  ) {
    this.fiatCurrency = fiatCurrency;
    this.timeStamp = timeStamp;
    this.holdings = holdings;

    let acc = BigNumber.ZERO;
    for (const value of holdings.values()) {
      acc = acc.plus(value.value); // ISSUE #33 It is unclear if totalValue should be a BigNumber or a Value
    }
    this.totalValue = acc;
  }

  get(crypto: CryptoAsset): Value {
    return (
      this.holdings.get(crypto) ?? new Value(this.fiatCurrency, BigNumber.ZERO)
    );
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

    this.holdings.forEach((amount, crypto) =>
      lines.push("  " + crypto.symbol + " " + amount.toDisplayString(options))
    );

    return lines.join("\n");
  }

  static async create(
    registry: CryptoRegistry,
    oracle: Oracle,
    fiatConverter: FiatConverter,
    fiatCurrency: FiatCurrency,
    timeStamp: number,
    amounts: Iterable<Amount>
  ): Promise<SnapshotValuation> {
    const holdings: Map<CryptoAsset, Value> = new Map();
    const date = new Date(timeStamp * 1000);
    for (const amount of amounts) {
      const crypto = amount.crypto;
      const prices = await oracle.getPrice(registry, crypto, date, [
        fiatCurrency,
      ]);
      const price = prices[fiatCurrency];
      if (price === undefined) {
        // prettier-ignore
        const message = `Can't price ${crypto.symbol }/${fiatCurrency} at ${date.toISOString()}`;

        log.warn("C3001", message);
        throw new MissingPriceError(crypto, fiatCurrency, date);
      }

      const value = valueFromAmountAndPrice(amount, price);
      holdings.set(crypto, value);
    }

    return new SnapshotValuation(fiatCurrency, timeStamp, holdings);
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

  static create(
    registry: CryptoRegistry,
    oracle: Oracle,
    fiatConverter: FiatConverter,
    fiatCurrency: FiatCurrency,
    snapshots: Snapshot[]
  ): Promise<PortfolioValuation> {
    return Promise.all(
      snapshots.map((snapshot) =>
        snapshot.evaluate(registry, oracle, fiatConverter, fiatCurrency)
      )
    ).then((snapshotValuations) => new PortfolioValuation(snapshotValuations));
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
