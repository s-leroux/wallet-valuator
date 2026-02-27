import { ColumnSpec, TabularAdapter } from "../../src/tabular/adapter.mjs";

export class FakeTabularAdapter implements TabularAdapter {
  *rows(): IterableIterator<readonly unknown[]> {
    // prettier-ignore
    const data = [
        [new Date("2026-02-09"), +1.0],
        [new Date("2026-02-10"), -2.2],
        [new Date("2026-02-11"), +3.5],
    ] as const;

    for (const row of data) yield row;
  }
  headings(): readonly ColumnSpec[] {
    return [
      { name: "timestamp", "date.format": "YYYY-MM-DD" },
      { name: "value" },
    ];
  }
}
