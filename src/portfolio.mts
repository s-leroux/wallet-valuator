import { Amount } from "./currency.mjs";
import { Ledger } from "./ledger.mjs";

interface Currency {
  readonly address: string;
}

interface Movement {
  timeStamp: number;
  amount: Amount;
  hash?: string;
}

export class Snapshot {
  timeStamp: number;
  holdings: Map<Currency, Amount>;

  constructor(
    ingress: boolean,
    movement: Movement,
    tags: Map<string, any>,
    parent?: Snapshot
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
    const currency = movement.amount.currency;
    const holding = this.holdings.get(currency) ?? new Amount(currency);
    console.log(
      `${holding} ${ingress ? "+" : "-"} ${movement.amount} ${
        currency.address
      } ${movement["type"]} ${movement["transaction"]?.hash}`
    );

    this.holdings.set(
      currency,
      holding
        ? ingress
          ? holding.plus(movement.amount)
          : holding.minus(movement.amount)
        : movement.amount
    );
  }

  toString(): string {
    const lines = [];

    this.holdings.forEach((amount, currency) =>
      lines.push(amount.toString() + " " + currency.address)
    );
    return lines.join("\n");
  }
}

export class Portfolio {
  snapshots: Snapshot[];

  /**
   * Create a Portfolio instance from a Ledger.
   *
   * This maps ledger's entries to Snapshots
   */
  constructor(ledger: Ledger) {
    let snapshots = (this.snapshots = []);
    let curr: Snapshot = null;

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
  }
}
