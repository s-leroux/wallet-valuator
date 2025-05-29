import { PortfolioValuation } from "../../valuation.mjs";
import { DisplayOptions, toDisplayString } from "../../displayable.mjs";
import { logger } from "../../debug.mjs";
import { formatDate } from "../../date.mjs";

const log = logger("valuation-reporter");

export class PortfolioValuationReporter {
  constructor(
    readonly portfolio: PortfolioValuation,
    readonly displayOptions: DisplayOptions = {}
  ) {}

  report() {
    const lines = [] as string[];
    for (const snapshot of this.portfolio) {
      const totalValueBeforeStr =
        snapshot.cryptoValueBefore.totalCryptoValue.toDisplayString(
          this.displayOptions
        );
      const totalValueAfterStr =
        snapshot.cryptoValueAfter.totalCryptoValue.toDisplayString(
          this.displayOptions
        );
      const difference = snapshot.cryptoValueBefore.totalCryptoValue.minus(
        snapshot.cryptoValueAfter.totalCryptoValue
      );

      lines.push(`D 211: ${formatDate("DD/MM/YYYY", snapshot.date)}`);

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

      lines.push(...snapshot.comments);

      // Portforlio value
      lines.push(`V 212: ${totalValueBeforeStr} -> ${totalValueAfterStr}`);

      // Value of the cash-out
      lines.push(`P 213: ${difference.toDisplayString(this.displayOptions)}`);

      // For cash-out, share of the total price to buy in the cash-out
      if (snapshot.cashInMulShare) {
        // Total price to buy BEFORE that transaction
        lines.push(
          `T 220: ${snapshot.fiscalCash
            .plus(snapshot.cashInMulShare)
            .toDisplayString(this.displayOptions)}`
        );

        // For cash-out, share of the total price to buy in the cash-out
        lines.push(
          `S 221: ${snapshot.cashInMulShare.toDisplayString(
            this.displayOptions
          )}`
        );
      }

      // Total fiat deposits
      lines.push(
        `    D: ${snapshot.fiatDeposits.toDisplayString(this.displayOptions)}`
      );

      // Gain or loss
      lines.push(
        `  G/L: ${snapshot.gainOrLoss?.toDisplayString(this.displayOptions)}`
      );

      // Now our holdings
      snapshot.cryptoValueAfter.positions.forEach(
        ({ value, amount }, cryptoAsset) => {
          const isNegative = value.value.isNegative(); // XXX Add isNegative to the Value interface
          const significant =
            isNegative || value.value.greaterThanOrEqualTo(0.0001); // XXX Add greaterThanOrEqualTo to the Value interface
          if (significant) {
            const flags = isNegative ? "XXX NEGATIVE" : "";
            lines.push(
              "  " +
                value.toDisplayString(this.displayOptions) +
                " " +
                amount.toDisplayString(this.displayOptions) +
                " " +
                flags
            );
          }
        }
      );

      lines.push("---");
    }
    return lines.join("\n");
  }
}
