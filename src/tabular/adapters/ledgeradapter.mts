import { Ledger } from "../../ledger.mjs";
import { TabularAdapter } from "../adapter.mjs";

export class LedgerTabularAdapter implements TabularAdapter {
  constructor(readonly head: Ledger) {}

  headings() {
    return ["type", "from", "to", "amount"] as const;
  }

  *rows() {
    for (const entry of this.head) {
      const tr = entry.transaction;
      yield [tr.type, tr.from, tr.to, tr.amount];
    }
  }
}
