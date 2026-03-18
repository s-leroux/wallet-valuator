import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";

import { InconsistentUnitsError, ValueError } from "../src/error.mjs";
import { BigNumber, Fixed, MAX_FIXED_SCALE } from "../src/bignumber.mjs";

describe("BigNumber", function () {
  const precision = 80;
  it(`can be created from and to string with at least ${precision} significant digits`, function () {
    // prettier-ignore
    {
      // eslint-disable-next-line no-loss-of-precision
      const M = +11111111112222222000000000000000000000000000000000000000000000000000000000000000;
      const N = "11111111112222222222333333333344444444445555555555666666666677777777778888888888";
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

  describe("arithmetic methods should return BigNumber", function () {
    it("plus, minus, mul, div, negated return BigNumber", function () {
      const a = new BigNumber(1);
      const b = new BigNumber(2);

      const plusResult: BigNumber = a.plus(b);
      const minusResult: BigNumber = a.minus(b);
      const timesResult: BigNumber = a.mul(b);
      const divResult: BigNumber = a.div(b);
      const negatedResult: BigNumber = a.negated();

      assert.instanceOf(plusResult, BigNumber);
      assert.instanceOf(minusResult, BigNumber);
      assert.instanceOf(timesResult, BigNumber);
      assert.instanceOf(divResult, BigNumber);
      assert.instanceOf(negatedResult, BigNumber);
    });
  });
});

describe("Fixed", function () {
  describe("constructor", function () {
    const register = prepare(this);

    const validCases: [bigint, bigint, string][] = [
      [0n, 0n, "0"],
      [1n, 0n, "1"],
      [12345n, 0n, "12345"],
      [1n, 1n, "0.1"],
      [12n, 1n, "1.2"],
      [123n, 2n, "1.23"],
      [100n, 2n, "1.00"],
      [1n, 2n, "0.01"],
      [-5n, 1n, "-0.5"],
      [
        10n ** MAX_FIXED_SCALE - 1n,
        MAX_FIXED_SCALE,
        `0.${"9".repeat(Number(MAX_FIXED_SCALE))}`,
      ],
    ];

    for (const [value, scale, expected] of validCases) {
      register(`value ${value}, scale ${scale} => "${expected}"`, () => {
        const f = new Fixed(value, scale);
        assert.equal(f.value, value);
        assert.equal(f.scale, scale);
        assert.equal(f.toFixed(), expected);
      });
    }

    describe("throws RangeError when scale is out of range", function () {
      const registerErr = prepare(this);

      const invalidScales: [bigint, string][] = [
        [-1n, "negative"],
        [MAX_FIXED_SCALE + 1n, "above max"],
        [100n, "100"],
      ];

      for (const [scale, desc] of invalidScales) {
        registerErr(desc, () => {
          assert.throws(
            () => new Fixed(0n, scale),
            RangeError,
            /Scale must be in the range/,
          );
        });
      }
    });
  });

  describe("plus()", function () {
    const register = prepare(this);

    const sameScaleCases: [bigint, bigint, bigint, bigint, string][] = [
      [1n, 2n, 3n, 2n, "0.04"],
      [0n, 1n, 0n, 1n, "0.0"],
      [10n, 1n, -3n, 1n, "0.7"],
      [100n, 2n, 50n, 2n, "1.50"],
    ];

    for (const [v1, p1, v2, p2, expected] of sameScaleCases) {
      register(
        `${v1}/${10 ** Number(p1)} + ${v2}/${10 ** Number(p2)} => ${expected}`,
        () => {
          const a = new Fixed(v1, p1);
          const b = new Fixed(v2, p2);
          const sum = a.plus(b);
          assert.equal(sum.toFixed(), expected);
          assert.equal(sum.scale, p1);
        },
      );
    }

    it("throws InconsistentUnitsError when scales differ", function () {
      const a = new Fixed(1n, 1n);
      const b = new Fixed(1n, 2n);
      assert.throws(() => a.plus(b), InconsistentUnitsError);
      assert.throws(() => b.plus(a), InconsistentUnitsError);
    });
  });

  describe("minus()", function () {
    const register = prepare(this);

    const sameScaleCases: [bigint, bigint, bigint, bigint, string][] = [
      [5n, 1n, 2n, 1n, "0.3"],
      [0n, 2n, 0n, 2n, "0.00"],
      [10n, 1n, 15n, 1n, "-0.5"],
      [100n, 2n, 33n, 2n, "0.67"],
    ];

    for (const [v1, p1, v2, p2, expected] of sameScaleCases) {
      register(
        `${v1}/${10 ** Number(p1)} - ${v2}/${10 ** Number(p2)} => ${expected}`,
        () => {
          const a = new Fixed(v1, p1);
          const b = new Fixed(v2, p2);
          const diff = a.minus(b);
          assert.equal(diff.toFixed(), expected);
          assert.equal(diff.scale, p1);
        },
      );
    }

    it("throws InconsistentUnitsError when scales differ", function () {
      const a = new Fixed(1n, 1n);
      const b = new Fixed(1n, 2n);
      assert.throws(() => a.minus(b), InconsistentUnitsError);
      assert.throws(() => b.minus(a), InconsistentUnitsError);
    });
  });

  describe("mul()", function () {
    const register = prepare(this);

    const cases: [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint | undefined,
      string,
    ][] = [
      [10n, 1n, 20n, 1n, undefined, "2.00"],
      [3n, 0n, 4n, 0n, undefined, "12"],
      [1n, 2n, 1n, 2n, undefined, "0.0001"],
      [100n, 2n, 10n, 1n, 2n, "1.00"],
      [123n, 1n, 456n, 1n, 1n, "560.8"],
      [999n, 2n, 1n, 0n, 2n, "9.99"],
    ];

    for (const [v1, p1, v2, p2, optPrec, expected] of cases) {
      const precStr =
        optPrec === undefined ? "default scale" : `scale ${optPrec}`;
      register(
        `(${v1},${p1}) * (${v2},${p2}) ${precStr} => ${expected}`,
        () => {
          const a = new Fixed(v1, p1);
          const b = new Fixed(v2, p2);
          const product = optPrec === undefined ? a.mul(b) : a.mul(b, optPrec);
          assert.equal(product.toFixed(), expected);
        },
      );
    }

    it("throws ValueError when requested scale exceeds result scale", function () {
      const a = new Fixed(1n, 1n);
      const b = new Fixed(1n, 1n);
      assert.throws(
        () => a.mul(b, 3n),
        ValueError,
        /Requested scale 3 exceeds result scale 2/,
      );
    });
  });

  describe("div()", function () {
    const register = prepare(this);

    const cases: [bigint, bigint, bigint, bigint, string][] = [
      [10n, 1n, 2n, 1n, "5.0"],
      [1n, 0n, 2n, 0n, "0"],
      [100n, 2n, 10n, 1n, "1.00"],
      [1n, 2n, 1n, 2n, "1.00"],
      [22n, 1n, 7n, 1n, "3.1"],
    ];

    for (const [v1, p1, v2, p2, expected] of cases) {
      register(`(${v1},${p1}) / (${v2},${p2}) => ${expected}`, () => {
        const a = new Fixed(v1, p1);
        const b = new Fixed(v2, p2);
        const q = a.div(b);
        assert.equal(q.toFixed(), expected);
        assert.equal(q.scale, p1);
      });
    }

    it("throws RangeError when divisor is zero", function () {
      const a = new Fixed(1n, 1n);
      const zero = new Fixed(0n, 1n);
      assert.throws(() => a.div(zero), RangeError, /Division by zero/);
    });
  });

  describe("negated()", function () {
    const register = prepare(this);

    const cases: [bigint, bigint, string][] = [
      [5n, 1n, "-0.5"],
      [-3n, 1n, "0.3"],
      [0n, 2n, "0.00"],
    ];

    for (const [value, scale, expectedNegated] of cases) {
      register(`negated(${value}, ${scale}) => ${expectedNegated}`, () => {
        const f = new Fixed(value, scale);
        const n = f.negated();
        assert.equal(n.toFixed(), expectedNegated);
        assert.equal(n.scale, scale);
      });
    }
  });

  describe("toFixed() and toString()", function () {
    const register = prepare(this);

    const cases: [bigint, bigint, string][] = [
      [0n, 0n, "0"],
      [1n, 0n, "1"],
      [0n, 2n, "0.00"],
      [7n, 2n, "0.07"],
      [12345n, 3n, "12.345"],
      [-1n, 1n, "-0.1"],
      [-100n, 2n, "-1.00"],
    ];

    for (const [value, scale, expected] of cases) {
      register(`(${value}, ${scale}) => "${expected}"`, () => {
        const f = new Fixed(value, scale);
        assert.equal(f.toFixed(), expected);
        assert.equal(f.toString(), expected);
      });
    }

    const overrideCases: [bigint, bigint, number, string][] = [
      [12345n, 3n, 3, "12.345"],
      [12345n, 3n, 2, "12.34"],
      [12345n, 3n, 1, "12.3"],
      [12345n, 3n, 0, "12"],
      [12345n, 3n, 4, "12.3450"],
      [12345n, 3n, 6, "12.345000"],
      [-12345n, 3n, 2, "-12.34"],
      [7n, 2n, 1, "0.0"],
      [7n, 2n, 0, "0"],
    ];

    for (const [value, scale, digits, expected] of overrideCases) {
      register(
        `(${value}, ${scale}).toFixed(${digits}) => "${expected}"`,
        () => {
          const f = new Fixed(value, scale);
          assert.equal(f.toFixed(digits), expected);
        },
      );
    }
  });

  describe("withScale()", function () {
    const register = prepare(this);

    const cases: [bigint, bigint, bigint, string][] = [
      [100n, 2n, 2n, "1.00"],
      [100n, 2n, 1n, "1.0"],
      [100n, 2n, 0n, "1"],
      [12345n, 4n, 2n, "1.23"],
      [1n, 1n, 2n, "0.10"],
      [5n, 0n, 2n, "5.00"],
    ];

    for (const [value, prec, newPrec, expected] of cases) {
      register(
        `(${value}, ${prec}).withScale(${newPrec}) => ${expected}`,
        () => {
          const f = new Fixed(value, prec);
          const g = f.withScale(newPrec);
          assert.equal(g.toFixed(), expected);
          assert.equal(g.scale, newPrec);
        },
      );
    }

    const truncationCases: [bigint, bigint, bigint, string][] = [
      // ensure truncation (no rounding) when reducing scale
      [12349n, 3n, 2n, "12.34"],
      [12341n, 3n, 2n, "12.34"],
      // BigInt division is truncation toward zero; pin current behaviour for negatives
      [-12349n, 3n, 2n, "-12.34"],
      [-12341n, 3n, 2n, "-12.34"],
    ];

    for (const [value, scale, newScale, expected] of truncationCases) {
      register(
        `(${value}, ${scale}).withScale(${newScale}) truncates => ${expected}`,
        () => {
          const f = new Fixed(value, scale);
          assert.equal(f.withScale(newScale).toFixed(), expected);
        },
      );
    }

    it("throws RangeError when requested scale is out of range", function () {
      const f = new Fixed(1n, 1n);
      assert.throws(() => f.withScale(MAX_FIXED_SCALE + 1n), RangeError);
      assert.throws(() => f.withScale(-1n), RangeError);
    });
  });
});
