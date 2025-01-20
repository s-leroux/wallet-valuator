import type { DataSource } from "../../src/coofile.mjs";
import { bsearch } from "../../src/bsearch.mjs";

export class FakeDataSource implements DataSource<Date, number> {
  prices: [Date, number, number][];

  constructor() {
    // pretier-ignore
    const prices = [
      // ["Date", "BTC in USD", "BTC in EUR"]
      ["2024-12-01", 95_850.28, 92_318.29],
      ["2024-12-02", 92_326.35, 91_826.97],
      ["2024-12-03", 91_316.18, 91_343.64],
      ["2024-12-04", 91_339.36, 93_966.82],
      ["2024-12-05", 93_950.09, 91_237.91],
      ["2024-12-06", 91_709.23, 94_532.37],
      ["2024-12-07", 94_640.95, 95_903.76],
      ["2024-12-08", 95_850.28, 92_318.29],
      ["2024-12-09", 92_326.35, 91_826.97],
      ["2024-12-10", 91_316.18, 91_343.64],
    ] as const;

    this.prices = prices.map(([d, ...n]) => [new Date(d), ...n]);
  }

  get(date: Date, col: string): [Date, number] | undefined {
    const row = bsearch(this.prices, date);
    if (!row) return undefined;

    switch (col) {
      case "USD":
        return [row[0], row[1]];
      case "EUR":
        return [row[0], row[2]];
      default:
        return undefined;
    }
  }
}
