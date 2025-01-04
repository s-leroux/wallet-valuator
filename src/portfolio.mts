import { Amount } from "./cryptoasset.mjs";
import { Ledger } from "./ledger.mjs";

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
    console.log(
      `${holding} ${ingress ? "+" : "-"} ${movement.amount} ${crypto} ${
        (movement as any)["type"]
      } ${(movement as any)["transaction"]?.hash}`
    );

    this.holdings.set(
      crypto,
      holding
        ? ingress
          ? holding.plus(movement.amount)
          : holding.minus(movement.amount)
        : movement.amount
    );
  }

  toString(): string {
    const lines: string[] = [];

    this.holdings.forEach((amount, crypto) =>
      lines.push(amount.toString() + " " + crypto.symbol)
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
    let snapshots = (this.snapshots = [] as Snapshot[]);
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
  }
}
