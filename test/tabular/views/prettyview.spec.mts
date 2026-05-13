import { assert } from "chai";
import { FakeTabularAdapter } from "../../support/tabularadapter.fake.mjs";
import { PrettyTabularView } from "../../../src/tabular/views/prettyview.mjs";
import { numberFormat } from "../../../src/displayable.mjs";

describe("PrettyTabularView", () => {
  describe("lines()", () => {
    it("should format rows as padded columns", () => {
      const adapter = new FakeTabularAdapter();
      const view = new PrettyTabularView(adapter);

      const lines = Array.from(
        view.lines([
          { name: "timestamp", "date.format": "YYYY-MM-DD" },
          { name: "value" },
        ]),
      );

      assert.deepEqual(lines, [
        "2026-02-09|   1",
        "2026-02-10|-2.2",
        "2026-02-11| 3.5",
      ]);
    });

    it("should reorder fields as requested", () => {
      const adapter = new FakeTabularAdapter();
      const view = new PrettyTabularView(adapter);

      const lines = Array.from(
        view.lines([
          { name: "value" },
          { name: "value", "number.format": numberFormat("6.4") },
          { name: "timestamp", "date.format": "YYYY-MM-DD" },
        ]),
      );

      assert.deepEqual(lines, [
        "   1|1.0000|2026-02-09",
        "-2.2|-2.20…|2026-02-10",
        " 3.5|3.5000|2026-02-11",
      ]);
    });
  });
});
