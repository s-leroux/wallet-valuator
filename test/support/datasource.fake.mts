import type { DataSource } from "../../src/csvfile.mjs";
import { bsearch } from "../../src/bsearch.mjs";

export class FakeDataSource<T> implements DataSource<T, number> {
  prices: [T, number, number][];

  constructor(factory: (v: string) => T) {
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

    this.prices = prices.map(([d, ...n]) => [factory(d), ...n]);
  }

  get(date: T, col: string): [T, number] | undefined {
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

  [Symbol.iterator](): Iterator<[T, ...number[]]> {
    return this.prices[Symbol.iterator]();
  }
}
