import { Amount } from "../../cryptoasset.mjs";
import { Snapshot } from "../../portfolio.mjs";
import { TabularAdapter } from "../adapter.mjs";

export class SnapshotTabularAdapter implements TabularAdapter {
  constructor(readonly head: Snapshot) {}

  headings() {
    return [{ name: "date", "date.format": "DD/MM/YYYY" }, { name: "delta" }];
  }

  *rows() {
    const snapshots: Snapshot[] = [];
    let curr: Snapshot | null = this.head;
    while (curr) {
      snapshots.push(curr);
      curr = curr.parent;
    }

    for (const snapshot of snapshots) {
      yield [
        new Date(snapshot.timeStamp / 1000),
        snapshot.tags.get("DELTA") as Amount,
      ];
    }
  }
}
