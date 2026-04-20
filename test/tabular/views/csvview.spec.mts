import assert from "assert";
import { FakeTabularAdapter } from "../../support/tabularadapter.fake.mjs";
import { CSVTabularView } from "../../../src/tabular/views/csvview.mjs";

describe("CSVTabularView", () => {
  describe("lines()", () => {
    it("should format rows as CSV with default separator", () => {
      const adapter = new FakeTabularAdapter();
      const view = new CSVTabularView(adapter);

      const lines = Array.from(
        view.lines([
          { name: "timestamp", "date.format": "YYYY-MM-DD" },
          { name: "value" },
        ]),
      );

      assert.deepEqual(lines, [
        "2026-02-09,1",
        "2026-02-10,-2.2",
        "2026-02-11,3.5",
      ]);
    });
  });
});
