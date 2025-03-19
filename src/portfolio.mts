import os from "node:os";

import { type CryptoAsset, Amount } from "./cryptoasset.mjs";
import type { FiatCurrency } from "./fiatcurrency.mjs";
import type { Ledger } from "./ledger.mjs";
import { SnapshotValuation, PortfolioValuation } from "./valuation.mjs";
import type { FiatConverter } from "./services/fiatconverter.mjs";
import type { CryptoRegistry } from "./cryptoregistry.mjs";
import type { Oracle } from "./services/oracle.mjs";
import { DisplayOptions, TextUtils } from "./displayable.mjs";
import { ValueError } from "./error.mjs";

interface Movement {
  timeStamp: number;
  amount: Amount;
  hash?: string;
}

export class Snapshot {
  readonly timeStamp: number;
  readonly amount: Amount; // Keep track of the movement's amount
  readonly holdings: Map<CryptoAsset, Amount>; // Portfolio balance _after_ update
  readonly tags: Map<string, any>; // Copy of the transaction's tags

  constructor(
    ingress: boolean,
    movement: Movement,
    tags: Map<string, any>,
    parent: Snapshot | null = null
  ) {
    this.timeStamp = movement.timeStamp;
    this.amount = movement.amount;
    // Naive implementation: just clone the whole map
    this.holdings = new Map(parent?.holdings);
    this.tags = new Map(tags);
    this.update(ingress, movement, tags);
  }

  update(ingress: boolean, movement: Movement, tags: Map<string, any>): void {
    /*
     * This is where all the "magic" happens.
     * This function uses a set of well-known tags and heuristics to
     * update the current snapshot to reflect the portfolio balance
     * after a movement
     */

    // Basic implementation: just update the position
    const amount = movement.amount;
    const crypto = amount.crypto;
    const holding = this.holdings.get(crypto);
    let newAmount: Amount;

    if (ingress) {
      newAmount = holding ? holding.plus(movement.amount) : movement.amount;
      this.tags.set("INGRESS", amount);
    } else {
      // problem: we may encounter an underflow!
      try {
        newAmount = (holding ? holding : new Amount(crypto)).minus(
          movement.amount
        );
      } catch (err: unknown) {
        if (err instanceof ValueError) {
          console.log(
            `Attempt to remove ${movement.amount} from ${holding ?? 0} at ${
              movement.timeStamp
            }`
          );
          newAmount = new Amount(crypto); // clamp to zero
        } else {
          throw err;
        }
      }
      this.tags.set("EGRESS", amount);
    }

    this.holdings.set(crypto, newAmount);
  }

  // XXX I am not sure this is meaningful without the previous snapshot valuation,
  // notably to update the total deposits (in fiat currency).
  /*
  evaluate(
    registry: CryptoRegistry,
    oracle: Oracle,
    fiatConverter: FiatConverter,
    fiatCurrency: FiatCurrency
  ): Promise<SnapshotValuation> {
    return SnapshotValuation.create(
      registry,
      oracle,
      fiatConverter,
      fiatCurrency,
      this.timeStamp,
      this.holdings.values(),
      this.tags
    );
  }
  */

  assets(): CryptoAsset[] {
    return Array.from(this.holdings.keys());
  }

  //========================================================================
  //  String conversion
  //========================================================================
  toString(): string {
    const lines: string[] = [];

    this.holdings.forEach((amount, crypto) => lines.push(amount.toString()));
    return lines.join("\n");
  }

  toDisplayString(options: DisplayOptions = {}) {
    const lines: string[] = [TextUtils.formatDate(this.timeStamp * 1000)];
    this.holdings.forEach((amount, crypto) =>
      lines.push(amount.toDisplayString(options))
    );

    return lines.join("\n");
  }
}

export class Portfolio {
  snapshots: Snapshot[];

  constructor(snapshots: Snapshot[]) {
    this.snapshots = snapshots;
  }

  /**
   * Create a Portfolio instance from a Ledger.
   *
   * This maps ledger's entries to Snapshots
   */
  static createFromLedger(ledger: Ledger): Portfolio {
    let snapshots = [] as Snapshot[];
    let curr: Snapshot | null = null;

    for (const entry of ledger) {
      const ingress = entry.tags.get("INGRESS") ?? false;
      const egress = entry.tags.get("EGRESS") ?? false;

      if (ingress && egress) {
        // This is an inter-account transfer
        // Ignoring
        continue;
      } else if (ingress || egress) {
        curr = new Snapshot(ingress, entry.record, entry.tags, curr);
        snapshots.push(curr);
      } else {
        // Not our business
      }
    }

    return new Portfolio(snapshots);
  }

  /**
   * Return all the assets that has been owned in that portfolio
   *
   * Given the Snapshot implementation this is the same as checking
   * the assets of the _last_ snapshot
   */
  allAssetsEverOwned(): CryptoAsset[] {
    return this.snapshots.at(-1)?.assets() ?? [];
  }

  //========================================================================
  //  String representation
  //========================================================================
  toString() {
    const head = "Portfolio([";
    const tail = "])";
    const body = TextUtils.indent(this.snapshots.map(String));
    if (body) {
      return `${head}\n${body}\n${tail}`;
    }

    return `${head}${tail}`;
  }

  toDisplayString(options: DisplayOptions = {}) {
    return this.snapshots
      .map((snapshot) => snapshot.toDisplayString(options))
      .join("\n");
  }

  asCSV(): string {
    const separator = ",";
    const lines = [] as string[];
    const cryptoAssets = this.allAssetsEverOwned();

    // Header line
    lines.push(
      cryptoAssets
        .reduce(
          (acc, cryptoAsset) => (acc.push(cryptoAsset.symbol), acc),
          ["DATE"]
        )
        .join(separator) + os.EOL
    );

    // Data lines
    for (const snapshot of this.snapshots) {
      const items = cryptoAssets.reduce(
        // ISSUE #24 Move that logic to Snapshot ?
        (acc, cryptoAsset) => (
          acc.push(snapshot.holdings.get(cryptoAsset)?.value.toString() ?? "0"),
          acc
        ),
        [snapshot.timeStamp.toString()]
      );
      lines.push(items.join(separator) + os.EOL);
    }
    return lines.join("");
  }

  //========================================================================
  //  Evaluations
  //========================================================================
  evaluate(
    registry: CryptoRegistry,
    oracle: Oracle,
    fiatConverter: FiatConverter,
    fiatCurrency: FiatCurrency
  ): Promise<PortfolioValuation> {
    return PortfolioValuation.create(
      registry,
      oracle,
      fiatConverter,
      fiatCurrency,
      this.snapshots
    );
  }
}
