import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";
import { Ensure } from "../src/type.mjs";

describe("Type utilities", function () {
  describe("Ensure", function () {
    const register = prepare(this);

    function ownsProperty(obj: unknown) {
      return Ensure.ownsProperty(obj, "prop");
    }

    // prettier-ignore
    const test_cases = [
      ["isString", null, TypeError],
      ["isString", ""],
      ["isString", "abcde"],
      ["isString", 123, TypeError],
      ["isString", 123.456, TypeError],
      ["isString", {}, TypeError],
      ["isString", [], TypeError],
      ["isString", ["abcde"], TypeError],
      ["isString", ["abcde", "fghij"], TypeError],
      ["isString", ["abcde", 123], TypeError],

      ["isNumber", null, TypeError],
      ["isNumber", "", TypeError],
      ["isNumber", "abcde", TypeError],
      ["isNumber", 123],
      ["isNumber", 123.456],
      ["isNumber", {}, TypeError],
      ["isNumber", [], TypeError],
      ["isNumber", ["abcde"], TypeError],
      ["isNumber", ["abcde", "fghij"], TypeError],
      ["isNumber", ["abcde", 123], TypeError],

      [ownsProperty, { prop: "value" }],
      [ownsProperty, { other: "value" }, TypeError],
      [ownsProperty, {}, TypeError],
      [ownsProperty, null, TypeError],
      [ownsProperty, undefined, TypeError],
      [ownsProperty, 123, TypeError],
      [ownsProperty, "string", TypeError],
      [ownsProperty, [], TypeError],
      [ownsProperty, ["abcde"], TypeError],
      [ownsProperty, ["abcde", "fghij"], TypeError],
      [ownsProperty, ["abcde", 123], TypeError],

      ["isArray", null, TypeError],
      ["isArray", "", TypeError],
      ["isArray", "abcde", TypeError],
      ["isArray", 123, TypeError],
      ["isArray", 123.456, TypeError],
      ["isArray", {}, TypeError],
      ["isArray", ["abcde"]],
      ["isArray", ["abcde", "fghij"]],
      ["isArray", ["abcde", 123]],

      ["isStringArray", null, TypeError],
      ["isStringArray", "", TypeError],
      ["isStringArray", "abcde", TypeError],
      ["isStringArray", 123, TypeError],
      ["isStringArray", 123.456, TypeError],
      ["isStringArray", {}, TypeError],
      ["isStringArray", ["abcde"]],
      ["isStringArray", ["abcde", "fghij"]],
      ["isStringArray", ["abcde", 123], TypeError],
    ] as const;

    for (const [fn, value, errType] of test_cases) {
      register(`case ${fn}(${value}) [${errType?.name || "OK"}]`, () => {
        const fct = typeof fn === "string" ? Ensure[fn] : fn;
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
