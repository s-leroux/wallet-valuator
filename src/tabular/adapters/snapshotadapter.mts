import { Amount } from "../../cryptoasset.mjs";
import { Snapshot } from "../../portfolio.mjs";
import { TabularAdapter } from "../adapter.mjs";

export class SnapshotTabularAdapter implements TabularAdapter {
  constructor(readonly head: Snapshot) {}

  headings() {
    return ["date", "type", "delta", "tags"] as const;
  }

  *rows() {
    // Rewrite the table in reverse chronological order.
    const snapshots: Snapshot[] = [];
    let curr: Snapshot | null = this.head;
    while (curr) {
      snapshots.push(curr);
      curr = curr.parent;
    }

    // yield rows from table
    for (const snapshot of snapshots) {
      // Snapshot.timeStamp is Unix time in seconds; Date expects milliseconds.
      const date = new Date(snapshot.timeStamp * 1000);
      yield [
        date,
        snapshot.type,
        snapshot.tags.get("DELTA") as Amount,
        [...snapshot.tags.keys()].join(", "),
      ];
    }
  }
}
