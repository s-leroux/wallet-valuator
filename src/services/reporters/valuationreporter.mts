import { PortfolioValuation } from "../../valuation.mjs";
import { DisplayOptions, toDisplayString } from "../../displayable.mjs";

export class PortfolioValuationReporter {
  constructor(
    readonly portfolio: PortfolioValuation,
    readonly displayOptions: DisplayOptions = {}
  ) {}

  report() {
    const lines = [] as string[];
    for (const snapshot of this.portfolio) {
      const date = snapshot.date.toISOString().slice(0, 10); // YYYY-MM-DD
      const totalValueBeforeStr =
        snapshot.cryptoValueBefore.totalCryptoValue.toDisplayString(
          this.displayOptions
        );
      const totalValueAfterStr =
        snapshot.cryptoValueAfter.totalCryptoValue.toDisplayString(
          this.displayOptions
        );

      lines.push(date);

      // Add a line for the tags
      if (snapshot.tags.size) {
        const tags = [] as string[];
        for (const [key, value] of snapshot.tags) {
          if (value !== true) {
            tags.push(`${key}=${toDisplayString(value, this.displayOptions)}`);
          } else {
            tags.push(String(key));
          }
        }
        lines.push(tags.join(" "));
      }

      lines.push(`V: ${totalValueBeforeStr} -> ${totalValueAfterStr}`);

      lines.push(
        `D: ${snapshot.fiatDeposits.toDisplayString(this.displayOptions)}`
      );
      lines.push(
        `C: ${snapshot.fiscalCash.toDisplayString(this.displayOptions)}`
      );
      lines.push(
        `G: ${snapshot.gainOrLoss?.toDisplayString(this.displayOptions)}`
      );

      // Now our holdings
      snapshot.cryptoValueAfter.positions.forEach(
        ({ value, amount }, cryptoAsset) => {
          if (!value.isZero()) {
            lines.push(
              "  " +
                value.toDisplayString(this.displayOptions) +
                " " +
                amount.toDisplayString(this.displayOptions)
            );
          }
        }
      );
    }
    return lines.join("\n");
  }
}
