import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";
import { Ensure } from "../src/type.mjs";

describe("Type utilities", function () {
  describe("Ensure", function () {
    const register = prepare(this);

    // prettier-ignore
    const test_cases = [
      ["isString", null, TypeError],
      ["isString", ""],
      ["isString", "abcde"],
      ["isString", 123, TypeError],
      ["isString", 123.456, TypeError],
      ["isString", {}, TypeError],
      ["isString", [], TypeError],

      ["isNumber", null, TypeError],
      ["isNumber", "", TypeError],
      ["isNumber", "abcde", TypeError],
      ["isNumber", 123],
      ["isNumber", 123.456],
      ["isNumber", {}, TypeError],
      ["isNumber", [], TypeError],
    ] as const;

    for (const [fn, value, errType] of test_cases) {
      register(`case ${fn}(${value}) [${errType?.name || "OK"}]`, () => {
        const fct = Ensure[fn];
        assert.isDefined(fct, `Ensure.${fn}() does not exist`);

        if (errType) {
          assert.throws(() => fct(value), errType);
        } else {
          assert.strictEqual(fct(value), value);
        }
      });
    }
  });
});
