import { assert } from "chai";
import { columnIndices } from "../../src/tabular/view.mjs";
import { ValueError } from "../../src/error.mjs";

describe("Tabular view utilities", () => {
  describe("columnIndices", () => {
    it("returns heading indices in column-spec order", () => {
      assert.deepStrictEqual(
        columnIndices(["a", "b", "c"], [{ name: "c" }, { name: "a" }]),
        [2, 0],
      );
    });

    it("throws ValueError when a column name is missing from headings", () => {
      assert.throws(
        () =>
          columnIndices(
            ["timestamp", "value"],
            [{ name: "timestamp" }, { name: "not_a_column" }],
          ),
        ValueError,
      );
    });

    it("lists every unknown name at least once in the error", () => {
      let capture: Error;
      function test() {
        try {
          columnIndices(
            ["x"],
            [
              { name: "bad_a" },
              { name: "bad_b" },
              { name: "x" },
              { name: "bad_c" },
            ],
          );
        } catch (err) {
          capture = err as Error;

          throw err;
        }
      }

      assert.throws(test, ValueError);

      assert.include(capture!.message, "bad_a");
      assert.include(capture!.message, "bad_b");
      assert.include(capture!.message, "bad_c");
      assert.notInclude(capture!.message, "good_x");
    });
  });
});
