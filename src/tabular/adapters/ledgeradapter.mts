import { Ledger } from "../../ledger.mjs";

export class LedgerTabularAdapter {
  constructor(readonly head: Ledger) {}

  headings() {
    return [""];
  }
}
