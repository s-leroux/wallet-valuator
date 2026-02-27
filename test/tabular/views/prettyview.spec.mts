import assert from "assert";
import { FakeTabularAdapter } from "../../support/tabularadapter.fake.mjs";
import { PrettyTabularView } from "../../../src/tabular/views/prettyview.mjs";

describe("PrettyTabularView", () => {
  describe("lines()", () => {
    it("should format rows as padded columns", () => {
      const adapter = new FakeTabularAdapter();
      const view = new PrettyTabularView(adapter);

      const lines = Array.from(view.lines());

      assert.deepEqual(lines, [
        "2026-02-09|   1",
        "2026-02-10|-2.2",
        "2026-02-11| 3.5",
      ]);
    });
  });
});

