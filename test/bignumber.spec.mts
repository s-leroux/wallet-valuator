import { assert } from "chai";

import { BigNumber } from "../src/bignumber.mjs";

describe("BigNumber", function () {
  it("can be created from and to string with at least 20 significant digits", function () {
    const N = "12345678901234567890";
    const M = +12345678901234567000; // Notice the loss of precision compared to above
    const bn = new BigNumber(N);
    assert.equal(bn.toNumber(), M);
    assert.equal(bn.toString(), N);
  });

  it("should correctly initialize from an integer base unit and a number of decimal places.", () => {
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
      const actual = BigNumber.fromDigits(value, decimal);

      assert.equal(actual.toFixed(), expected, `case ${value}:${decimal}`);
    }
  });
});
