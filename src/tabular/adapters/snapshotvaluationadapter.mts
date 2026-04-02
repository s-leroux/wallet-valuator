import { SnapshotValuation } from "../../valuation.mjs";
import { TabularAdapter } from "../adapter.mjs";

export class SnapshotValuationTabularAdapter implements TabularAdapter {
  constructor(readonly head: SnapshotValuation) {}

  headings() {
    return ["date", "deposits", "cashIn", "value", "tags"] as const;
  }

  *rows() {
    const { head } = this;
    const tags = [...head.tags.keys()].join(", ");

    yield [
      head.date,
      head.fiatDeposits,
      head.fiscalCash,
      head.cryptoValueAfter.totalCryptoValue,
      tags,
    ];
  }
}
