import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";

import { BigNumber } from "../src/bignumber.mjs";

describe("BigNumber", function () {
  const precision = 80;
  it(`can be created from and to string with at least ${precision} significant digits`, function () {
    // prettier-ignore
    {
      const N = "11111111112222222222333333333344444444445555555555666666666677777777778888888888";
      const M = +11111111112222222000000000000000000000000000000000000000000000000000000000000000;
      //                         ^
      //         12345678901234567
      //         00000000011111111
      //         JavaScript number precision is 17 decimal places

      // self-test: ensure we are REALLY testing up to the expected precision
      assert.equal(N.length, precision, "Please review test source");

      // the real tests now:
      const bn = new BigNumber(N);
      assert.equal(bn.plus(0).toNumber(), M);
      assert.equal(bn.plus(0).toPrecision(precision), N);
    }
  });

  describe("should correctly initialize from an integer base unit and a number of decimal places.", function () {
    const register = prepare(this);

    const testCases: [string, number, string][] = [
      ["12345", 0, "12345"],
      ["12345", 1, "1234.5"],
      ["12345", 2, "123.45"],
      ["12345", 3, "12.345"],
      ["12345", 4, "1.2345"],
      ["12345", 5, "0.12345"],
      ["12345", 6, "0.012345"],
      ["12345", 7, "0.0012345"],
      ["12345", 8, "0.00012345"],
      ["12345", 9, "0.000012345"],
      ["12345", 10, "0.0000012345"],
      ["12345", 11, "0.00000012345"],
      ["12345", 12, "0.000000012345"],
      ["12345", 13, "0.0000000012345"],
      ["12345", 14, "0.00000000012345"],
      ["12345", 15, "0.000000000012345"],
      ["12345", 16, "0.0000000000012345"],
      ["12345", 17, "0.00000000000012345"],
      ["12345", 18, "0.000000000000012345"],
      ["12345", 19, "0.0000000000000012345"],
      ["12345", 20, "0.00000000000000012345"],
    ];

    for (const [value, decimal, expected] of testCases) {
      register(`${decimal} decimal places`, () => {
        const actual = BigNumber.fromDigits(value, decimal);

        assert.equal(actual.toFixed(), expected, `case ${value}:${decimal}`);
      });
    }
  });

  describe(`should have a static from() method accepting`, function () {
    const register = prepare(this);

    const testcases = [
      [123.456, "number"],
      ["123.456", "number"],
      [new BigNumber(123.456), "BigNumber"],
    ];

    for (const [value, desc] of testcases) {
      register(`a ${desc} parameter`, () => {
        const bn = BigNumber.from(value);

        assert.instanceOf(bn, BigNumber);
        assert.equal(bn.toString(), "123.456");
      });
    }
  });
});
