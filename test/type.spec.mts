import { assert } from "chai";

import { ValueError } from "../src/error.mjs";
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

      ["isInteger", null, TypeError],
      ["isInteger", "", TypeError],
      ["isInteger", "abcde", TypeError],
      ["isInteger", 123],
      ["isInteger", 0],
      ["isInteger", -1],
      ["isInteger", Number(123)],
      ["isInteger", 123.456, ValueError],
      ["isInteger", Number.NaN, ValueError],
      ["isInteger", Number.POSITIVE_INFINITY, ValueError],
      ["isInteger", Number.NEGATIVE_INFINITY, ValueError],
      ["isInteger", {}, TypeError],
      ["isInteger", [], TypeError],
      ["isInteger", ["abcde"], TypeError],
      ["isInteger", ["abcde", "fghij"], TypeError],
      ["isInteger", ["abcde", 123], TypeError],
      ["isInteger", 1n, TypeError],

      ["isNonNegativeInteger", null, TypeError],
      ["isNonNegativeInteger", undefined, TypeError],
      ["isNonNegativeInteger", true, TypeError],
      ["isNonNegativeInteger", false, TypeError],
      ["isNonNegativeInteger", "", TypeError],
      ["isNonNegativeInteger", "abcde", TypeError],
      ["isNonNegativeInteger", Symbol("isNonNegativeInteger"), TypeError],
      ["isNonNegativeInteger", 123],
      ["isNonNegativeInteger", 0],
      ["isNonNegativeInteger", -0],
      ["isNonNegativeInteger", Number(123)],
      ["isNonNegativeInteger", -1, ValueError],
      ["isNonNegativeInteger", -123, ValueError],
      ["isNonNegativeInteger", 123.456, ValueError],
      ["isNonNegativeInteger", Number.NaN, ValueError],
      ["isNonNegativeInteger", Number.POSITIVE_INFINITY, ValueError],
      ["isNonNegativeInteger", Number.NEGATIVE_INFINITY, ValueError],
      ["isNonNegativeInteger", {}, TypeError],
      ["isNonNegativeInteger", [], TypeError],
      ["isNonNegativeInteger", ["abcde"], TypeError],
      ["isNonNegativeInteger", ["abcde", "fghij"], TypeError],
      ["isNonNegativeInteger", ["abcde", 123], TypeError],
      ["isNonNegativeInteger", 0n, TypeError],
      ["isNonNegativeInteger", 1n, TypeError],

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
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- object/array labels are diagnostic only; explicit String() is required for symbol values (TS).
      register(
        `case ${fn}(${String(value)}) [${errType?.name || "OK"}]`,
        () => {
          const fct = typeof fn === "string" ? Ensure[fn] : fn;
          assert.isDefined(fct, `Ensure.${fn}() does not exist`);

          if (errType) {
            assert.throws(() => fct(value), errType);
          } else {
            assert.strictEqual(fct(value), value);
          }
        },
      );
    }
  });
});
