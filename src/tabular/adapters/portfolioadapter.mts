import { Portfolio } from "../../portfolio.mjs";
import { TabularAdapter } from "../adapter.mjs";
import { SnapshotTabularAdapter } from "./snapshotadapter.mjs";

export class PortfolioTabularAdapter implements TabularAdapter {
  constructor(readonly portfolio: Portfolio) {}

  private get snapshotAdapter(): TabularAdapter | null {
    const head = this.portfolio.snapshots.at(-1);
    if (!head) {
      return null;
    }
    return new SnapshotTabularAdapter(head);
  }

  headings(): readonly string[] {
    const adapter = this.snapshotAdapter;
    return adapter ? adapter.headings() : [];
  }

  *rows(): Iterable<readonly unknown[]> {
    const adapter = this.snapshotAdapter;
    if (!adapter) {
      return;
    }
    yield* adapter.rows();
  }
}
