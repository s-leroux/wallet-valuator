import os from "node:os";

import { NotImplementedError } from "./error.mjs";
import { Amount } from "./cryptoasset.mjs";
import { FiatCurrency } from "./fiatcurrency.mjs";
import { Ledger } from "./ledger.mjs";
import { Valuation } from "./valuation.mjs";
import { Oracle } from "./services/oracle.mjs";

interface CryptoAsset {
  symbol: string;
}

interface Movement {
  timeStamp: number;
  amount: Amount;
  hash?: string;
}

export class Snapshot {
  timeStamp: number;
  holdings: Map<CryptoAsset, Amount>;

  constructor(
    ingress: boolean,
    movement: Movement,
    tags: Map<string, any>,
    parent: Snapshot | null = null
  ) {
    this.timeStamp = movement.timeStamp;
    // Naive implementation: just clone the whole map
    this.holdings = new Map(parent?.holdings);
    this.update(ingress, movement, tags);
  }

  update(ingress: boolean, movement: Movement, tags: Map<string, any>): void {
    /*
     * This is where all the "magic" happens.
     * This function uses a set of well-known tags and heuristics to
     * update the current snapshot to reflect the portfolio value
     * after a movement
     */

    // Basic implementation: just update the position
    const crypto = movement.amount.crypto;
    const holding = this.holdings.get(crypto) ?? new Amount(crypto);
    /*
    console.log(
      `${holding} ${ingress ? "+" : "-"} ${movement.amount} ${crypto} ${
        (movement as any)["type"]
      } ${(movement as any)["transaction"]?.hash}`
    );
    */

    this.holdings.set(
      crypto,
      holding
        ? ingress
          ? holding.plus(movement.amount)
          : holding.minus(movement.amount)
        : movement.amount
    );
  }

  evaluate(oracle: Oracle, fiatCurrency: FiatCurrency): Promise<Valuation> {
    return Valuation.create(
      oracle,
      fiatCurrency,
      this.timeStamp,
      this.holdings.values()
    );
  }

  assets(): CryptoAsset[] {
    return Array.from(this.holdings.keys());
  }

  toString(): string {
    const lines: string[] = [];

    this.holdings.forEach((amount, crypto) => lines.push(amount.toString()));
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
        // should we throw an error here?
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

  asCSV(): string {
    const separator = ",";
    const lines = [] as string[];
    const cryptoAssets = this.allAssetsEverOwned();

    // Header line
    lines.push(
      cryptoAssets.map((cryptoAsset) => cryptoAsset.symbol).join(separator)
    );

    // Data lines
    for (const cryptoAsset of cryptoAssets) {
    }
    return lines.join(os.EOL);
  }
}
