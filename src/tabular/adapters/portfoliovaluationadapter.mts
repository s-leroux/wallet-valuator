import { PortfolioValuation } from "../../valuation.mjs";
import { TabularAdapter } from "../adapter.mjs";
import { SnapshotValuationTabularAdapter } from "./snapshotvaluationadapter.mjs";

export class PortfolioValuationTabularAdapter implements TabularAdapter {
  constructor(readonly portfolioValuation: PortfolioValuation) {}

  private get snapshotAdapter(): TabularAdapter | null {
    const head = this.portfolioValuation.snapshotValuations.at(-1);
    if (!head) {
      return null;
    }
    return new SnapshotValuationTabularAdapter(head);
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
