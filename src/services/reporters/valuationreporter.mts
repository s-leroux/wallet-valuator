import { PortfolioValuation } from "../../valuation.mjs";
import { DisplayOptions } from "../../displayable.mjs";

export class PortfolioValuationReporter {
  constructor(
    readonly portfolio: PortfolioValuation,
    readonly displayOptions: DisplayOptions = {}
  ) {}

  report() {
    const lines = [] as string[];
    for (const snapshot of this.portfolio) {
      const date = snapshot.date.toISOString().slice(0, 10); // YYYY-MM-DD
      const totalValueBeforeStr = snapshot.cryptoValueBefore.toDisplayString(
        this.displayOptions
      );
      const totalValueAfterStr = snapshot.cryptoValueAfter.toDisplayString(
        this.displayOptions
      );
      lines.push(`${date}: ${totalValueBeforeStr} -> ${totalValueAfterStr}`);
    }
    return lines.join("\n");
  }
}
