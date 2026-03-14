import { Ledger } from "../../ledger.mjs";
import { TabularAdapter } from "../adapter.mjs";

export class LedgerTabularAdapter implements TabularAdapter {
  constructor(readonly ledger: Ledger) {}

  headings() {
    return ["timeStamp", "type", "from", "to", "amount"] as const;
  }

  *rows() {
    for (const entry of this.ledger.entries) {
      yield [
        entry.transaction.timeStamp,
        entry.transaction.type,
        entry.transaction.from,
        entry.transaction.to,
        entry.transaction.amount,
      ];
    }
  }
}
