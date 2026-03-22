import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";
import { registerRuntimePinnedBuildTest } from "./support/runtime-pinned-build.helper.mjs";

import { ValueError } from "../src/error.mjs";
import {
  BigNumber,
  decomposeFiniteDouble,
  Fixed,
  IntegerSource,
  MAX_FIXED_SCALE,
} from "../src/bignumber.mjs";

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
  registerRuntimePinnedBuildTest();

  describe("decomposeFiniteDouble()", function () {
    const register = prepare(this);

    const testCases: [
      value: number,
      sign: 1n | -1n,
      mantissa: bigint,
      exponent: bigint,
    ][] = [
      // zero (both signs normalize to +0 decomposition)
      [0, 1n, 0n, 0n],
      [-0, 1n, 0n, 0n],

      // normal values with positive returned exponent
      [2 ** 60, 1n, 1n << 52n, 8n],
      [-(2 ** 60), -1n, 1n << 52n, 8n],

      // normal values with negative returned exponent
      [2 ** -10, 1n, 1n << 52n, -62n],
      [-(2 ** -10), -1n, 1n << 52n, -62n],

      // subnormal values (exponent is fixed to -1074)
      [Number.MIN_VALUE, 1n, 1n, -1074n],
      [-Number.MIN_VALUE, -1n, 1n, -1074n],
      [Number.MIN_VALUE * 5, 1n, 5n, -1074n],
      [-(Number.MIN_VALUE * 5), -1n, 5n, -1074n],

      // Wikipedia examples (https://en.wikipedia.org/wiki/Double-precision_floating-point_format)
      [1, 1n, 1n << 52n, -52n],
      [1.0000000000000002, 1n, (1n << 52n) + 1n, -52n],
      [2, 1n, 1n << 52n, -51n],
      [-2, -1n, 1n << 52n, -51n],
      [3, 1n, 3n << 51n, -51n],
      [4, 1n, 1n << 52n, -50n],
      [5, 1n, 5n << 50n, -50n],
      [6, 1n, 3n << 51n, -50n],
      [23, 1n, 23n << 48n, -48n],
      [3 / 256, 1n, 3n << 51n, -59n],
    ];

    for (const [value, sign, mantissa, exponent] of testCases) {
      register(`decomposes ${String(value)}`, () => {
        const d = decomposeFiniteDouble(value);
        assert.equal(d.sign, sign);
        assert.equal(d.mantissa, mantissa);
        assert.equal(d.e2, exponent);
      });
    }

    it("throws on non-finite inputs", function () {
      assert.throws(() => decomposeFiniteDouble(Number.NaN), ValueError);
      assert.throws(
        () => decomposeFiniteDouble(Number.POSITIVE_INFINITY),
        ValueError,
      );
      assert.throws(
        () => decomposeFiniteDouble(Number.NEGATIVE_INFINITY),
        ValueError,
      );
    });
  });

  describe("constants", function () {
    it("E18 is 10^18 base units", function () {
      assert.equal(Fixed.E18.value, 10n ** 18n);
      assert.equal(Fixed.E18.scale, 0n);
      assert.equal(Fixed.E18.toFixed(), "1000000000000000000");
    });
  });

  describe("fromInteger()", function () {
    const register = prepare(this);

    const cases: [IntegerSource, string][] = [
      ["12345", "12345"],
      ["-12345", "-12345"],
      [12345n, "12345"],
      [-12345n, "-12345"],
    ];

    for (const [v, expected] of cases) {
      register(`${String(v)} => ${expected}`, () => {
        const f = Fixed.fromInteger(v);
        assert.equal(f.scale, 0n);
        assert.equal(f.toFixed(), expected);
      });
    }
  });

  describe("fromString()", function () {
    const register = prepare(this);

    const cases: [string, string][] = [
      ["0", "0"],
      ["000", "0"],
      ["1", "1"],
      ["-1", "-1"],
      ["12.34", "12.34"],
      ["0.01", "0.01"],
      ["-0.50", "-0.50"],
      ["  7.0  ", "7.0"],
    ];

    for (const [input, expected] of cases) {
      register(`${JSON.stringify(input)} => ${expected}`, () => {
        const f = Fixed.fromString(input);
        assert.equal(f.toFixed(), expected);
      });
    }

    describe("rejects invalid strings", function () {
      const registerErr = prepare(this);

      const invalid: [string, string][] = [
        ["", "empty"],
        [" ", "spaces"],
        [".", "dot only"],
        ["1.", "trailing dot"],
        [".1", "leading dot"],
        ["1.2.3", "multiple dots"],
        ["1e3", "exponent"],
        ["- 1", "space in sign"],
        ["abc", "letters"],
      ];

      for (const [input, desc] of invalid) {
        registerErr(desc, () =>
          assert.throws(() => Fixed.fromString(input), SyntaxError),
        );
      }
    });
  });

  describe("fromDigits()", function () {
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
        const f = Fixed.create(value, scale);
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
            () => Fixed.create(0n, scale),
            RangeError,
            /Scale must be in the range/,
          );
        });
      }
    });
  });

  describe("fromNumber() and toNumber()", function () {
    it("fromNumber rejects NaN and non-finite values", function () {
      assert.throws(() => Fixed.fromNumber(Number.NaN, 0), ValueError);
      assert.throws(
        () => Fixed.fromNumber(Number.POSITIVE_INFINITY, 0),
        ValueError,
      );
      assert.throws(
        () => Fixed.fromNumber(Number.NEGATIVE_INFINITY, 0),
        ValueError,
      );
    });

    it("fromNumber rejects out-of-range scale", function () {
      assert.throws(() => Fixed.fromNumber(1, -1n), RangeError);
      assert.throws(
        () => Fixed.fromNumber(1, MAX_FIXED_SCALE + 1n),
        RangeError,
      );
    });

    describe("fromNumber()", function () {
      const register = prepare(this);

      const cases: [n: number, unscaledValue: bigint, scale: bigint][] = [
        [0, 0n, 0n],
        [0, 0n, 2n],
        [-0, 0n, 4n],
        [1, 1n, 0n],
        [-1.25, -125n, 2n],
        [Math.PI, 31415n, 4n],
        [0.1 + 0.2, 30n, 2n],
        [123.456789, 12345678900n, 8n],
        [123.456789, 1234567890n, 7n],
        [123.456789, 123456789n, 6n],
        [123.456789, 12345678n, 5n],
        [123.456789, 1234567n, 4n],
        [123.456789, 123456n, 3n],
        [123.456789, 12345n, 2n],
        [123.456789, 1234n, 1n],
        [123.456789, 123n, 0n],
        // `MAX_SAFE_INTEGER / 1000` is not exact as a double; trunc×10³ lands on 9007199254740990, not MAX_SAFE_INTEGER.
        [Number.MAX_SAFE_INTEGER / 1000, 9007199254740990n, 3n],
        [Number.MIN_SAFE_INTEGER / 1000, -9007199254740990n, 3n],
        [1e22, 10000000000000000000000n, 0n],
      ];

      for (const [n, unscaledValue, scale] of cases) {
        register(`n=${n}, scale=${scale}`, () => {
          const f = Fixed.fromNumber(n, scale);
          assert.equal(f.value, unscaledValue);
          assert.equal(f.scale, scale);
        });
      }
    });

    describe("roundtrip number ⇒ Fixed ⇒ number at 10^-scale", function () {
      const register = prepare(this);

      const cases: [number, bigint][] = [
        [0, 0n],
        [0, 2n],
        [-0, 4n],
        [1, 0n],
        [-1.25, 2n],
        [Math.PI, 4n],
        [0.1 + 0.2, 2n],
        [123.456789, 8n],
        [123.456789, 7n],
        [123.456789, 6n],
        [123.456789, 5n],
        [123.456789, 4n],
        [123.456789, 3n],
        [123.456789, 2n],
        [123.456789, 1n],
        [123.456789, 0n],
        [Number.MAX_SAFE_INTEGER / 1000, 3n],
        [Number.MIN_SAFE_INTEGER / 1000, 3n],
        [1e22, 0n],
      ];

      for (const [n, scale] of cases) {
        register(`n=${n}, scale=${scale}`, () => {
          const f = Fixed.fromNumber(n, scale);
          const back = f.toNumber();
          assert.closeTo(back, n, Math.pow(10, -Number(scale)));
        });
      }
    });

    describe("roundtrip Fixed ⇒ number ⇒ Fixed for exact decimals", function () {
      const register = prepare(this);

      const decimals: readonly string[] = [
        "0",
        "1",
        "-1",
        "12.345",
        "0.000001",
        "999999.99",
        "-0.001",
        "-10000012.34",
        // ±(2^53 − 1): extrema of integers exactly representable as JS number
        String(Number.MAX_SAFE_INTEGER),
        String(Number.MIN_SAFE_INTEGER),
        "10000000000000000000000", // 10^22
      ];

      for (const s of decimals) {
        register(`fromString(${JSON.stringify(s)})`, () => {
          const original = Fixed.fromString(s);
          const scale = original.scale;
          const n = original.toNumber();
          const back = Fixed.fromNumber(n, scale);

          // `Fixed -> number` goes through IEEE-754 binary64 and is generally lossy.
          // Therefore `fromNumber(n, scale)` must match the quantization of `n`
          // itself at `10^-scale` (truncation toward zero), not necessarily `original`.
          const expected = (() => {
            const { sign, mantissa, e2 } = decomposeFiniteDouble(n);
            const s = scale;

            const fivePowScale = 5n ** s;
            const shift2 = e2 + s;

            const signedNumerator = sign * mantissa * fivePowScale;
            const unscaledValue =
              shift2 >= 0n
                ? signedNumerator << shift2
                : signedNumerator / (1n << -shift2);

            return Fixed.create(unscaledValue, s);
          })();

          assert.isTrue(
            back.equals(expected),
            `${original.toFixed()} -> ${n} -> ${back.toFixed()} (expected ${expected.toFixed()})`,
          );
        });
      }
    });
  });

  describe("from()", function () {
    it("accepts bigint as integer", function () {
      const f = Fixed.from(123n);
      assert.equal(f.toFixed(), "123");
      assert.equal(f.scale, 0n);
    });

    it("accepts string", function () {
      const f = Fixed.from("1.23");
      assert.equal(f.toFixed(), "1.23");
      assert.equal(f.scale, 2n);
    });

    it("returns Fixed instance as-is", function () {
      const original = Fixed.create(123n, 2n);
      const f = Fixed.from(original);
      assert.deepEqual(f, original);
    });
  });

  describe("withDecimals()", function () {
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
        `(${value}, ${prec}).withDecimals(${newPrec}) => ${expected}`,
        () => {
          const f = Fixed.create(value, prec);
          const g = f.withDecimals(newPrec);
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
          const f = Fixed.create(value, scale);
          assert.equal(f.withDecimals(newScale).toFixed(), expected);
        },
      );
    }

    it("throws RangeError when requested scale is out of range", function () {
      const f = Fixed.create(1n, 1n);
      assert.throws(() => f.withDecimals(MAX_FIXED_SCALE + 1n), RangeError);
      assert.throws(() => f.withDecimals(-1n), RangeError);
    });
  });

  describe("compare()", function () {
    const register = prepare(this);

    const pairCases: [string, string, -1 | 0 | 1][] = [
      // same scale
      ["1.23", "1.23", 0],
      ["1.23", "1.24", -1],
      ["1.24", "1.23", 1],
      ["-1.23", "-1.24", 1],
      // different scales but equal numeric value
      ["1", "1.0", 0],
      ["0.1", "0.10", 0],
      ["-0.50", "-0.5", 0],
      // different scales, different numeric value
      ["0.09", "0.1", -1],
      ["12.3", "12.30", 0],
      ["12.30", "12.301", -1],
    ];

    for (const [a, b, expected] of pairCases) {
      register(
        `${JSON.stringify(a)} cmp ${JSON.stringify(b)} => ${expected}`,
        () => {
          const fa = Fixed.fromString(a);
          const fb = Fixed.fromString(b);
          assert.equal(fa.compare(fb), expected);
        },
      );
    }

    it("treats all zeros as equal regardless of scale", function () {
      const a = Fixed.create(0n, 0n);
      const b = Fixed.create(0n, 5n);
      assert.equal(a.compare(b), 0);
      assert.equal(b.compare(a), 0);
    });

    it('treats "+0", "-0", "0" as equal across scales', function () {
      const variants = ["0", "+0", "-0", "0.0", "+0.00", "-0.000"] as const;
      const fixed = variants.map((v) => Fixed.fromString(v));

      for (const a of fixed) {
        for (const b of fixed) {
          assert.equal(a.compare(b), 0);
          assert.isTrue(a.equals(b));
        }
      }
    });

    it("defines a total order across mixed scales (sorting)", function () {
      const inputs = [
        "0",
        "0.0",
        "-0.00",
        "-1",
        "-0.1",
        "0.09",
        "0.1",
        "1",
        "1.0",
        "1.01",
        "10",
        "9.99",
      ];
      const fixed = inputs.map((s) => Fixed.fromString(s));

      fixed.sort((x, y) => x.compare(y));

      const actual = fixed.map((f) => f.toFixed());
      const expected = [
        "-1",
        "-0.1",
        "0",
        "0.0",
        "0.00",
        "0.09",
        "0.1",
        "1",
        "1.0",
        "1.01",
        "9.99",
        "10",
      ];
      assert.deepEqual(actual, expected);
    });
  });

  describe("plus()", function () {
    const register = prepare(this);

    const cases: [bigint, bigint, bigint, bigint, string, bigint][] = [
      [1n, 2n, 3n, 2n, "0.04", 2n],
      [0n, 1n, 0n, 1n, "0.0", 1n],
      [10n, 1n, -3n, 1n, "0.7", 1n],
      [100n, 2n, 50n, 2n, "1.50", 2n],
      [1n, 1n, 1n, 2n, "0.11", 2n],
      [123n, 3n, 77n, 1n, "7.823", 3n],
    ];

    for (const [v1, p1, v2, p2, expected, expectedScale] of cases) {
      register(
        `${v1}/${10 ** Number(p1)} + ${v2}/${10 ** Number(p2)} => ${expected}`,
        () => {
          const a = Fixed.create(v1, p1);
          const b = Fixed.create(v2, p2);
          const sum = a.plus(b);
          assert.equal(sum.toFixed(), expected);
          assert.equal(sum.scale, expectedScale);
        },
      );
    }

    it("is commutative with mixed scales and keeps max scale", function () {
      const a = Fixed.create(1n, 1n);
      const b = Fixed.create(1n, 2n);
      const ab = a.plus(b);
      const ba = b.plus(a);
      assert.equal(ab.toFixed(), "0.11");
      assert.equal(ba.toFixed(), "0.11");
      assert.equal(ab.scale, 2n);
      assert.equal(ba.scale, 2n);
    });
  });

  describe("minus()", function () {
    const register = prepare(this);

    const cases: [bigint, bigint, bigint, bigint, string, bigint][] = [
      [5n, 1n, 2n, 1n, "0.3", 1n],
      [0n, 2n, 0n, 2n, "0.00", 2n],
      [10n, 1n, 15n, 1n, "-0.5", 1n],
      [100n, 2n, 33n, 2n, "0.67", 2n],
      [10n, 1n, 1n, 2n, "0.99", 2n],
      [100n, 3n, 5n, 1n, "-0.400", 3n],
    ];

    for (const [v1, p1, v2, p2, expected, expectedScale] of cases) {
      register(
        `${v1}/${10 ** Number(p1)} - ${v2}/${10 ** Number(p2)} => ${expected}`,
        () => {
          const a = Fixed.create(v1, p1);
          const b = Fixed.create(v2, p2);
          const diff = a.minus(b);
          assert.equal(diff.toFixed(), expected);
          assert.equal(diff.scale, expectedScale);
        },
      );
    }

    it("handles mixed scales in both operand orders", function () {
      const a = Fixed.create(1n, 1n);
      const b = Fixed.create(1n, 2n);
      assert.equal(a.minus(b).toFixed(), "0.09");
      assert.equal(b.minus(a).toFixed(), "-0.09");
      assert.equal(a.minus(b).scale, 2n);
      assert.equal(b.minus(a).scale, 2n);
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

    for (const [v1, p1, v2, p2, requestedScale, expected] of cases) {
      const precStr =
        requestedScale === undefined
          ? "default scale"
          : `scale ${requestedScale}`;
      register(
        `(${v1},${p1}) * (${v2},${p2}) ${precStr} => ${expected}`,
        () => {
          const a = Fixed.create(v1, p1);
          const b = Fixed.create(v2, p2);
          const product =
            requestedScale === undefined ? a.mul(b) : a.mul(b, requestedScale);
          assert.equal(product.toFixed(), expected);
        },
      );
    }

    it("throws ValueError when requested scale exceeds result scale", function () {
      const a = Fixed.create(1n, 1n);
      const b = Fixed.create(1n, 1n);
      assert.throws(
        () => a.mul(b, 3n),
        ValueError,
        /Requested scale 3 exceeds result scale 2/,
      );
    });
  });

  describe("div()", function () {
    const register = prepare(this);

    const cases: [bigint, bigint, bigint, bigint, bigint, string][] = [
      [10n, 1n, 2n, 1n, 1n, "5.0"],
      [1n, 0n, 2n, 0n, 0n, "0"],
      [100n, 2n, 10n, 1n, 2n, "1.00"],
      [1n, 2n, 1n, 2n, 2n, "1.00"],
      [22n, 1n, 7n, 1n, 1n, "3.1"],
    ];

    for (const [v1, p1, v2, p2, targetScale, expected] of cases) {
      register(
        `(${v1},${p1}) / (${v2},${p2}) @ ${targetScale} => ${expected}`,
        () => {
          const a = Fixed.create(v1, p1);
          const b = Fixed.create(v2, p2);
          const q = a.div(b, targetScale);
          assert.equal(q.toFixed(), expected);
          assert.equal(q.scale, targetScale);
        },
      );
    }

    it("throws RangeError when divisor is zero", function () {
      const a = Fixed.create(1n, 1n);
      const zero = Fixed.create(0n, 1n);
      assert.throws(() => a.div(zero, 1n), RangeError, /Division by zero/);
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
        const f = Fixed.create(value, scale);
        const n = f.negated();
        assert.equal(n.toFixed(), expectedNegated);
        assert.equal(n.scale, scale);
      });
    }
  });

  describe("sum()", function () {
    const register = prepare(this);

    const testCases: [string, string[], string, bigint][] = [
      // label, inputs, expected toFixed, expected scale
      ["multiple values with same scale", ["1.0", "2.5", "-0.5"], "3.0", 1n],
      [
        "zero is identity element (single and surrounded)",
        ["1.23"],
        "1.23",
        2n,
      ],
      [
        "zero is identity element (with explicit zeros)",
        ["0.00", "1.23", "0.00"],
        "1.23",
        2n,
      ],
      ["handles negative totals", ["-1.00", "0.25"], "-0.75", 2n],
      [
        "mixed scales are normalized to most precise operand",
        ["1.2", "0.03", "-0.001"],
        "1.229",
        3n,
      ],
    ];

    for (const [label, inputs, expectedString, expectedScale] of testCases) {
      register(label, () => {
        const [first, ...rest] = inputs.map((s) => Fixed.fromString(s));
        const s = Fixed.sum(first, ...rest);
        assert.equal(s.toFixed(), expectedString);
        assert.equal(s.scale, expectedScale);
      });
    }

    register("single argument returns identity value and scale", () => {
      const a = Fixed.fromString("1.2300");
      const s = Fixed.sum(a);
      assert.equal(s.toFixed(), "1.2300");
      assert.equal(s.scale, 4n);
    });
  });

  describe("toFixed() and toString()", function () {
    describe("toFixed", function () {
      const register = prepare(this);

      // prettier-ignore
      const cases: [bigint, bigint, string][] = [
        [0n, 0n, "0"],
        [1n, 0n, "1"],
        [0n, 2n, "0.00"],
        [7n, 2n, "0.07"],
        [12345n, 3n, "12.345"],
        [-1n, 1n, "-0.1"],
        [-100n, 2n, "-1.00"],
        // Integer magnitudes: 10, 20, 30, and 40 decimal digits (powers of ten)
        [10n **  9n + 1234n, 0n, "1000001234"],
        //                        00000000001111111111222222222233333333334444444444
        //                        01234567890123456789012345678901234567890123456789
        [10n ** 19n + 1234n, 0n, "10000000000000001234"],
        [10n ** 29n + 1234n, 0n, "100000000000000000000000001234"],
        [10n ** 39n + 1234n, 0n, "1000000000000000000000000000000000001234"],
        // Scale 2, magnitudes: 10, 20, 30, and 40 decimal digits (powers of ten)
        [10n ** 9n + 1234n, 2n,  "10000012.34"],
        //                        00000000001111111111222222222233333333334444444444
        //                        01234567890123456789012345678901234567890123456789
        [10n ** 19n + 1234n, 2n, "100000000000000012.34"],
        [10n ** 29n + 1234n, 2n, "1000000000000000000000000012.34"],
        [10n ** 39n + 1234n, 2n, "10000000000000000000000000000000000012.34"],
      ];

      for (const [value, scale, expected] of cases) {
        register(`(${value}, ${scale}) => "${expected}"`, () => {
          const f = Fixed.create(value, scale);
          assert.equal(f.toFixed(), expected);
          assert.equal(f.toString(), expected);
        });
      }
    });

    describe("toFixed(digits)", function () {
      const register = prepare(this);
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
            const f = Fixed.create(value, scale);
            assert.equal(f.toFixed(digits), expected);
          },
        );
      }
    });
  });
});

describe("BigNumber vs Fixed", function () {
  describe("construction + formatting", function () {
    const register = prepare(this);

    const cases = ["0", "1", "-1", "12.345", "0.07", "-0.50"] as const;
    for (const src of cases) {
      register(`parses and formats for ${JSON.stringify(src)}`, () => {
        // Fixed
        const fixed = Fixed.fromString(src);
        const fixedString = fixed.toFixed();

        // BigNumber constructor
        const bn = new BigNumber(src);
        const bnString = bn.toFixed(Number(fixed.scale));

        // BigNumber.fromString
        const bnFromString = BigNumber.fromString(src);
        const bnFromStringString = bnFromString.toFixed(Number(fixed.scale));

        // Compare
        assert.equal(bnString, fixedString);
        assert.equal(bnFromStringString, fixedString);
      });
    }

    register("whitespace: Fixed accepts, BigNumber rejects", () => {
      // Fixed
      const fixed = Fixed.fromString("  7.0  ");
      const fixedString = fixed.toFixed();

      // BigNumber
      const parseBigNumber = () => new BigNumber("  7.0  ");

      // Compare
      assert.equal(fixedString, "7.0");
      assert.throws(parseBigNumber, /DecimalError/);
    });

    register("E18 matches BigNumber.E18", () => {
      // Fixed
      const fixedString = Fixed.E18.toFixed();

      // BigNumber
      const bnString = BigNumber.E18.toFixed(0);

      // Compare
      assert.equal(bnString, fixedString);
    });
  });

  describe("arithmetic (compared via fixed-point formatting)", function () {
    const register = prepare(this);

    const plusMinusCases: [bigint, bigint, bigint, bigint][] = [
      [12345n, 3n, 500n, 3n], // 12.345 +/- 0.500
      [-100n, 2n, 33n, 2n], // -1.00 +/- 0.33
    ];

    for (const [aDigits, aScale, bDigits, bScale] of plusMinusCases) {
      register(
        `plus/minus keep scale (${aDigits},${aScale}) and (${bDigits},${bScale})`,
        () => {
          // Fixed
          const a = Fixed.create(aDigits, aScale);
          const b = Fixed.create(bDigits, bScale);
          const fixedPlus = a.plus(b).toFixed();
          const fixedMinus = a.minus(b).toFixed();

          // BigNumber
          const bnA = BigNumber.fromDigits(aDigits.toString(), Number(aScale));
          const bnB = BigNumber.fromDigits(bDigits.toString(), Number(bScale));
          const bnPlus = bnA.plus(bnB).toFixed(Number(aScale));
          const bnMinus = bnA.minus(bnB).toFixed(Number(aScale));

          // Compare
          assert.equal(bnPlus, fixedPlus);
          assert.equal(bnMinus, fixedMinus);
        },
      );
    }

    const negatedCases: [bigint, bigint][] = [
      [12345n, 3n],
      [-5n, 1n],
      [0n, 2n],
    ];

    for (const [digits, scale] of negatedCases) {
      register(`negated keeps scale (${digits},${scale})`, () => {
        // Fixed
        const fixed = Fixed.create(digits, scale).negated().toFixed();

        // BigNumber
        const bn = BigNumber.fromDigits(digits.toString(), Number(scale))
          .negated()
          .toFixed(Number(scale));

        // Compare
        assert.equal(bn, fixed);
      });
    }

    const mulCases: [bigint, bigint, bigint, bigint][] = [
      [123n, 1n, 456n, 2n], // 12.3 * 4.56 => scale 3
      [-10n, 1n, 20n, 1n], // -1.0 * 2.0 => scale 2
    ];

    for (const [aDigits, aScale, bDigits, bScale] of mulCases) {
      register(
        `mul default scale (${aDigits},${aScale}) * (${bDigits},${bScale})`,
        () => {
          // Fixed
          const a = Fixed.create(aDigits, aScale);
          const b = Fixed.create(bDigits, bScale);
          const fixedProduct = a.mul(b);
          const fixedString = fixedProduct.toFixed();

          // BigNumber
          const bnA = BigNumber.fromDigits(aDigits.toString(), Number(aScale));
          const bnB = BigNumber.fromDigits(bDigits.toString(), Number(bScale));
          const bnString = bnA.mul(bnB).toFixed(Number(fixedProduct.scale));

          // Compare
          assert.equal(bnString, fixedString);
        },
      );
    }

    const divCases: [bigint, bigint, bigint, bigint][] = [
      [22n, 1n, 7n, 1n], // 2.2 / 0.7 => 3.1 (truncation)
      [-22n, 1n, 7n, 1n], // -2.2 / 0.7 => -3.1 (toward zero)
    ];

    for (const [aDigits, aScale, bDigits, bScale] of divCases) {
      register(
        `div truncates toward zero (${aDigits},${aScale}) / (${bDigits},${bScale})`,
        () => {
          // Fixed
          const a = Fixed.create(aDigits, aScale);
          const b = Fixed.create(bDigits, bScale);
          const fixedString = a.div(b, aScale).toFixed();

          // BigNumber
          const bnA = BigNumber.fromDigits(aDigits.toString(), Number(aScale));
          const bnB = BigNumber.fromDigits(bDigits.toString(), Number(bScale));
          const bnString = bnA.div(bnB).toFixed(Number(aScale));

          // Compare
          assert.equal(bnString, fixedString);
        },
      );
    }
  });

  describe("toFixed(digits) override", function () {
    const register = prepare(this);

    const cases: [string, number[]][] = [
      ["-12.345", [0, 1, 2, 3, 4, 6]],
      ["0.07", [0, 1, 2, 3]],
    ];

    for (const [src, digitsList] of cases) {
      for (const digits of digitsList) {
        register(`${JSON.stringify(src)} toFixed(${digits})`, () => {
          // Fixed
          const fixed = Fixed.fromString(src);
          const fixedString = fixed.toFixed(digits);

          // BigNumber
          const bn = new BigNumber(src);
          const bnString = bn.toFixed(digits);

          // Compare
          assert.equal(bnString, fixedString);
        });
      }
    }
  });
});
