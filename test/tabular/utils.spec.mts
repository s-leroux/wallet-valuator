import assert from "assert";
import { asCSV } from "../../src/tabular/utils.mjs";
import type { TabularAdapter } from "../../src/tabular/adapter.mjs";

type Row = readonly [Date, number, string];
type DataSource = readonly Row[];

class SampleAdapter implements TabularAdapter {
  constructor(readonly dataSource: DataSource) {}

  headings(): readonly string[] {
    return ["timestamp", "value", "comment"];
  }

  *rows(): IterableIterator<readonly unknown[]> {
    for (const row of this.dataSource) {
      yield row;
    }
  }
}

describe("Tabular utils", () => {
  let data: DataSource;
  beforeEach(() => {
    data = [
      [new Date("2026-02-09"), 1, "first row"],
      [new Date("2026-02-10"), -2.2, "second row"],
    ];
  });

  describe("asCSV()", () => {
    it("should return an iterator of CSV-formatted lines", () => {
      const lines = Array.from(
        asCSV(
          data,
          SampleAdapter,
          { name: "timestamp", "date.format": "YYYY-MM-DD" },
          { name: "value" },
          { name: "comment" },
        ),
      );

      assert.deepEqual(lines, [
        "2026-02-09,1,first row",
        "2026-02-10,-2.2,second row",
      ]);
    });

    it("should support selecting a subset of columns", () => {
      const lines = Array.from(
        asCSV(data, SampleAdapter, { name: "comment" }, { name: "value" }),
      );

      assert.deepEqual(lines, ["first row,1", "second row,-2.2"]);
    });

    it("should support multiple occurences of the same column", () => {
      const lines = Array.from(
        asCSV(
          data,
          SampleAdapter,
          { name: "value" },
          { name: "comment" },
          { name: "value" },
        ),
      );

      assert.deepEqual(lines, ["1,first row,1", "-2.2,second row,-2.2"]);
    });

    it.skip("should propagate custom display options to formatting", () => {
      // TODO(issue/173): add amount/date formatting assertions.
      // ISSUE #214: we should improve `toDisplayString` to support string and number formatting options.
    });
  });
});
