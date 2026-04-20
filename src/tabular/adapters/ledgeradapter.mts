import { Ledger } from "../../ledger.mjs";
import { TabularAdapter } from "../adapter.mjs";

export class LedgerTabularAdapter implements TabularAdapter {
  constructor(readonly ledger: Ledger) {}

  headings() {
    return ["timeStamp", "type", "chainName", "from", "to", "amount"] as const;
  }

  *rows() {
    for (const entry of this.ledger.entries) {
      yield [
        entry.transaction.timeStamp,
        entry.transaction.type,
        entry.transaction.chainName.id,
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        entry.transaction.from.toString(),
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        entry.transaction.to.toString(),
        entry.transaction.amount.toString(),
      ];
    }
  }
}
