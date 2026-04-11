import { SnapshotValuation } from "../../valuation.mjs";
import { TabularAdapter } from "../adapter.mjs";

export class SnapshotValuationTabularAdapter implements TabularAdapter {
  constructor(readonly head: SnapshotValuation) {}

  headings() {
    return ["date", "deposits", "fiscalCash", "valueAfter", "tags"] as const;
  }

  *rows() {
    // Rewrite the table in reverse chronological order.
    const snapshots: SnapshotValuation[] = [];
    let curr: SnapshotValuation | null = this.head;
    while (curr) {
      snapshots.push(curr);
      curr = curr.parent;
    }

    // yield rows from table
    for (const snapshot of snapshots) {
      yield [
        snapshot.date,
        snapshot.fiatDeposits,
        snapshot.fiscalCash,
        snapshot.cryptoValueAfter.totalCryptoValue,
        [...snapshot.tags.keys()].join(", "),
      ];
    }
  }
}
