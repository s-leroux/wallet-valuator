import { assert } from "chai";

import { ValueError } from "../src/error.mjs";
import { prepare } from "./support/register.helper.mjs";
import { Ensure } from "../src/type.mjs";

describe("Type utilities", function () {
  describe("Ensure", function () {
    const register = prepare(this);

    //------------------------------------------------------------------
    //  Helpers
    //------------------------------------------------------------------

    function ownsProperty(key: string) {
      function _ownsProperty(obj: unknown) {
        return Ensure.ownsProperty(obj, key);
      }
      return _ownsProperty;
    }

    const encode = (value: unknown): string => {
      if (typeof value === "number") {
        if (Number.isNaN(value)) return "number:NaN";
        if (Object.is(value, -0)) return "number:-0";
        return `number:${value}`;
      }
      if (typeof value === "bigint") return `bigint:${value.toString()}`;
      if (typeof value === "string") return `string:${JSON.stringify(value)}`;
      if (typeof value === "boolean") return `boolean:${value}`;
      if (typeof value === "undefined") return "undefined";
      if (value === null) return "null";
      if (typeof value === "symbol") {
        return `symbol:${String(value.description)}`;
      }
      return `json:${JSON.stringify(value)}`;
    };

    //------------------------------------------------------------------
    //  Test data set
    //------------------------------------------------------------------

    // prettier-ignore
    const testDataSet = {
      __proto__: null,

      /**
       * Enumerate all the possible test cases for the type/value checks.
       */

      "constant.null": null,
      "constant.undefined": undefined,
      "constant.true": true,
      "constant.false": false,
      "constant.symbol": Symbol("Unique Symbol"),

      "string.empty": "",
      "string.one-char.a": "a",
      "string.one-char.space": " ",
      "string.two-char": "ab",
      "string.non-empty": "abcde",

      "number.integer": 123,
      "number.positive-zero": 0,
      "number.negative-zero": -0,
      "number.negative-integer": -123,
      "number.negative-integer.large": -123,
      "number.float": 123.456,
      "number.negative-float": -123.456,
      "number.NaN": Number.NaN,
      "number.POSITIVE_INFINITY": Number.POSITIVE_INFINITY,
      "number.NEGATIVE_INFINITY": Number.NEGATIVE_INFINITY,

      "bigint.zero": 0n,
      "bigint.one": 1n,
      "bigint.negative-one": -1n,

      "object.empty": {},
      "object.with-prop": { prop: "value" },
      "object.with-other-prop": { other: "value" },

      "array.empty": [],
      "array.single-string": ["abcde"],
      "array.strings": ["abcde", "fghij"],
      "array.string-and-int": ["abcde", 123],
      "array.integers": [123, 456],
      "array.floats": [123.456, 789.012],
      "array.mixed": ["one", 2, null],
      "array.nested.empty": [[], []],
      "array.object.empty": [{}, {}],
    } as const;

    //------------------------------------------------------------------
    //  Predicates
    //------------------------------------------------------------------

    // prettier-ignore
    const predicates = {
      __proto__: null,

      "isString": Ensure.isString,
      "isOneCharString": Ensure.isOneCharString,
      "isNumber": Ensure.isNumber,
      "isInteger": Ensure.isInteger,
      "isNonNegativeInteger": Ensure.isNonNegativeInteger,
      "isArray": Ensure.isArray,
      "isStringArray": Ensure.isStringArray,
      "ownsProperty": ownsProperty("prop"),
    } as const;

    //------------------------------------------------------------------
    //  Custom overrides — your custom set of test cases.
    //------------------------------------------------------------------

    type Override = {
      [K in Predicate]?: {
        [K in TestDataSet]?: ExpectedResult;
      };
    };

    // prettier-ignore
    const overrides: Override = {    
      "isString": {
        "string.empty": true,
        "string.one-char.a": true,
        "string.one-char.space": true,
        "string.two-char": true,
        "string.non-empty": true,
      },
      "isOneCharString": {
        "string.empty": ValueError,
        "string.one-char.a": true,
        "string.one-char.space": true,
        "string.two-char": ValueError,
        "string.non-empty": ValueError,
      },
      "isNumber": {
        "number.integer": true,
        "number.positive-zero": true,
        "number.negative-zero": true,
        "number.negative-integer": true,
        "number.negative-integer.large": true,
        "number.float": true,
        "number.negative-float": true,
        "number.NaN": ValueError,
        "number.POSITIVE_INFINITY": true,
        "number.NEGATIVE_INFINITY": true,
      },
      "isInteger": {
        "number.integer": true,
        "number.positive-zero": true,
        "number.negative-zero": true,
        "number.negative-integer": true,
        "number.negative-integer.large": true,
        "number.float": ValueError,
        "number.negative-float": ValueError,
        "number.NaN": ValueError,
        "number.POSITIVE_INFINITY": ValueError,
        "number.NEGATIVE_INFINITY": ValueError,
      },
      "isNonNegativeInteger": {
        "number.integer": true,
        "number.positive-zero": true,
        "number.negative-zero": true,
        "number.negative-integer": ValueError,
        "number.negative-integer.large": ValueError,
        "number.float": ValueError,
        "number.negative-float": ValueError,
        "number.NaN": ValueError,
        "number.POSITIVE_INFINITY": ValueError,
        "number.NEGATIVE_INFINITY": ValueError,
      },
      "ownsProperty": {
        "object.with-prop": true,
      },
      "isArray": {
        "array.empty": true,
        "array.single-string": true,
        "array.strings": true,
        "array.string-and-int": true,
        "array.integers": true,
        "array.floats": true,
        "array.mixed": true,
        "array.nested.empty": true,
        "array.object.empty": true,
      },
      "isStringArray": {
        "array.empty": true,
        "array.single-string": true,
        "array.strings": true,
      },
    } as const;

    //------------------------------------------------------------------
    //  Test cases
    //
    //  This is the cartesian product of the test data set and the predicates.
    //------------------------------------------------------------------

    type Predicate = Exclude<keyof typeof predicates, "__proto__">;

    type TestDataSet = Exclude<keyof typeof testDataSet, "__proto__">;
    type ExpectedResult = true | (new (...args: unknown[]) => Error);
    type TestCase = [Predicate, TestDataSet, ExpectedResult];

    const testCases: TestCase[] = [];
    for (const predicate of Object.keys(predicates)) {
      for (const key of Object.keys(testDataSet)) {
        testCases.push([
          predicate as Predicate,
          key as TestDataSet,
          overrides[predicate as Predicate]?.[key as TestDataSet] ?? TypeError,
        ]);
      }
    }

    for (const [predicate, testData, expectedResult] of testCases) {
      const fn = predicates[predicate];
      const value = testDataSet[testData];
      register(
        `case ${predicate}×${testData}: ${encode(value)} => [${expectedResult == true ? "OK" : expectedResult?.name}]`,
        () => {
          if (expectedResult !== true) {
            assert.throws(() => fn(value), expectedResult);
          } else {
            assert.strictEqual(fn(value), value);
          }
        },
      );
    }
  });
});
