import { assert } from "chai";

import {
  IntlNumberOptionBag,
  intlNumberWrapper,
  intlToCanonicalNumber,
  NumberParsingState,
} from "../src/intl.mjs";
import { ValueError } from "../src/error.mjs";

describe("Intl parser invariants", function () {
  describe("NumberParsingState", function () {
    it("keeps InitialDigit[0-2] contiguous for ++state transition", function () {
      assert.strictEqual(
        NumberParsingState.InitialDigit1,
        NumberParsingState.InitialDigit0 + 1,
      );
      assert.strictEqual(
        NumberParsingState.InitialDigit2,
        NumberParsingState.InitialDigit1 + 1,
      );
      // The increment chain used by `++state` must land on InitialDigit3.
      assert.strictEqual(
        NumberParsingState.InitialDigit3,
        NumberParsingState.InitialDigit2 + 1,
      );
    });

    it("keeps GroupDigit[0-2] contiguous for ++state transition", function () {
      assert.strictEqual(
        NumberParsingState.GroupDigit1,
        NumberParsingState.GroupDigit0 + 1,
      );
      assert.strictEqual(
        NumberParsingState.GroupDigit2,
        NumberParsingState.GroupDigit1 + 1,
      );
      // The increment chain used by `++state` must land on GroupDigit3.
      assert.strictEqual(
        NumberParsingState.GroupDigit3,
        NumberParsingState.GroupDigit2 + 1,
      );
    });
  });
});

describe("Intl", function () {
  describe("intlToCanonicalNumber", function () {
    type ErrorClass = new (...args: unknown[]) => Error;

    const options = {
      "D_ G_": {}, // default decimal separator, default grouping separator
      "DD G_": {
        // dot decimal separator, default grouping separator
        "decimal-separator": ".",
      },
      "DC G_": {
        // comma decimal separator, default grouping separator
        "decimal-separator": ",",
      },
      "D_ GC": {
        // default decimal separator, comma grouping separator
        "grouping-separator": ",",
      },
      "D_ GD": {
        // default decimal separator, dot grouping separator
        "grouping-separator": ".",
      },
      "DD GC": {
        // dot decimal separator, comma grouping separator
        "decimal-separator": ".",
        "grouping-separator": ",",
      },
      "DC GD": {
        // comma decimal separator, dot grouping separator
        "decimal-separator": ",",
        "grouping-separator": ".",
      },
      "DC GS": {
        // comma decimal separator, space grouping separator
        "decimal-separator": ",",
        "grouping-separator": " ",
      },
      "DC GC": {
        // comma decimal separator, comma grouping separator
        "decimal-separator": ",",
        "grouping-separator": ",",
      },
    } as const;

    // prettier-ignore
    const testCases: [options: keyof typeof options, input: string, expected: string | ErrorClass][] = [
      // Digits
      ["D_ G_", "", ValueError],
      ["D_ G_", "1", "1"],
      ["D_ G_", "12", "12"],
      ["D_ G_", "123", "123"],
      ["D_ G_", "1234", "1234"],
      ["D_ G_", "12345", "12345"],

      ["D_ G_", "123", "123"],
      ["DC G_", "123", "123"],
      ["DD G_", "123", "123"],
      ["DD GC", "123", "123"],
      ["DC GD", "123", "123"],
      ["DC GS", "123", "123"],

      ["D_ G_", "123.456", "123.456"],
      ["DC G_", "123.456", ValueError],
      ["DD G_", "123.456", "123.456"],
      ["DD GC", "123.456", "123.456"],
      ["DC GD", "123.456", "123456"],
      ["DC GS", "123.456", ValueError],

      ["D_ G_", "123,456", ValueError],
      ["DC G_", "123,456", "123.456"],
      ["DD G_", "123,456", ValueError],
      ["DD GC", "123,456", "123456"],
      ["DC GD", "123,456", "123.456"], 
      ["DC GS", "123,456", "123.456"],

      ["D_ G_", "123,456.789", ValueError],
      ["DC G_", "123,456.789", ValueError],
      ["DD G_", "123,456.789", ValueError],
      ["DD GC", "123,456.789", "123456.789"],
      ["DC GD", "123,456.789", ValueError], 
      ["DC GS", "123,456.789", ValueError],

      // Groups
      ["DC GS", "12345 ", ValueError],
      ["DC GS", "1234 5", ValueError],
      ["DC GS", "123 45", ValueError],
      ["DC GS", "12 345", "12345"],
      ["DC GS", "1 2345", ValueError],
      ["DC GS", " 12345", ValueError],

      // Sign
      ["D_ G_", "-123", "-123"],
      
      // Edge cases
      ["DC GC", "123", ValueError], // decimal separator == grouping separator
    ];

    for (const [optKey, input, expected] of testCases) {
      const expectedStr =
        typeof expected === "string" ? "'" + expected + "'" : expected.name;
      it(`'${optKey}' ${input} => ${expectedStr}`, function () {
        if (typeof expected === "string") {
          const result = intlToCanonicalNumber(input, options[optKey]);
          assert.strictEqual(result, expected);
          return;
        }

        assert.throws(
          () => intlToCanonicalNumber(input, options[optKey]),
          expected as ErrorConstructor,
        );
      });
    }
  });

  describe("intlNumberWrapper", function () {
    const testCases: [input: string, expected: number][] = [
      ["123", 123],
      ["123 456", 123456],
      ["123 456,789", 123456.789],
    ];

    for (const [input, expected] of testCases) {
      it(`${input} => ${expected}`, function () {
        const fn = intlNumberWrapper(Number, {
          "decimal-separator": ",",
          "grouping-separator": " ",
        });
        const result = fn(input);
        assert.strictEqual(result, expected);
      });
    }
  });
});
