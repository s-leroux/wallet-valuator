import { assert } from "chai";
import { FixedSource } from "../../src/bignumber.mjs";
import { Quantity } from "../../src/quantity.mjs";
import { InconsistentUnitsError } from "../../src/error.mjs";
import { prepare } from "./register.helper.mjs";

/** Factory for creating and comparing quantities */
type QuantityFactory<Unit, Q extends Quantity<Unit, Q>> = {
  /** Creates a new quantity with the given unit and value */
  make(unit: Unit, value: FixedSource): Q;
  /** Checks if two quantities have the same unit */
  unitEquals(a: Q, b: Q): boolean;
};

/**
 * Test the quantity interface implementation.
 *
 * @param factory - The factory used to create quantities
 * @param sampleUnit - The unit of the sample quantity
 * @param otherUnit - The unit of the other quantity for binary operations
 */
export function testQuantityInterface<Unit, Q extends Quantity<Unit, Q>>(
  factory: QuantityFactory<Unit, Q>,
  sampleUnit: Unit,
  otherUnit: Unit,
) {
  function assertQuantityEquals(a: Q, b: Q) {
    assert(
      factory.unitEquals(a, b),
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `Expected units to be equal (${a} vs ${b})`,
    );
    assert(
      a.value.equals(b.value),
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `Expected values to be equal (${a} vs ${b})`,
    );
  }

  describe(`implements the quantity interface`, () => {
    describe("plus() method", () => {
      it("should return the sum of two quantities", () => {
        const a = factory.make(sampleUnit, 8n);
        const b = factory.make(sampleUnit, 2n);
        const c = factory.make(sampleUnit, 10n);

        assertQuantityEquals(a.plus(b), c);
      });

      it("should throw if units are inconsistent on plus", () => {
        const x = factory.make(sampleUnit, 1n);
        const y = factory.make(otherUnit, 1n);

        assert.throws(() => x.plus(y), InconsistentUnitsError);
      });
    });

    describe("minus() method", () => {
      it("should return the difference between two quantities", () => {
        const a = factory.make(sampleUnit, 8n);
        const b = factory.make(sampleUnit, 2n);
        const c = factory.make(sampleUnit, 6n);

        assertQuantityEquals(a.minus(b), c);
      });

      it("should throw if units are inconsistent on minus", () => {
        const x = factory.make(sampleUnit, 1n);
        const y = factory.make(otherUnit, 1n);

        assert.throws(() => x.minus(y), InconsistentUnitsError);
      });
    });

    describe("scaledBy() method", function () {
      const register = prepare(this);
      const testCases: [FixedSource, FixedSource, FixedSource][] = [
        ["8", "10", "80"],
        ["8.00", "10", "80.00"],
        ["8.00", "10.0", "80.00"],
        ["8.0", "10.00", "80.0"],
        ["8.00", "2.000", "16.00"],
        ["8.00", "2.00", "16.00"],
        ["8.00", "2.0", "16.00"],
        ["8.00", "2", "16.00"],
      ];

      for (const [value, factor, expected] of testCases) {
        register(`${value} * ${factor} => ${expected}`, () => {
          const a = factory.make(sampleUnit, value);
          const b = factory.make(sampleUnit, expected);
          assertQuantityEquals(a.scaledBy(factor), b);
        });
      }
    });

    describe("relativeTo() method", function () {
      const register = prepare(this);
      const testCases: [
        numerator: FixedSource,
        denominator: FixedSource,
        expected: RegExp,
      ][] = [
        [8n, 16n, /^0$/], // integer division
        ["8", "16", /^0$/], // integer division
        ["8.0", "16.0", /^0\.500*$/], // one decimal digit fixed-point division
        ["8.00", "16.00", /^0\.5000*$/], // two decimal digit fixed-point division
        ["8.0", "16.00", /^0\.50*$/], // heterogeneous scale fixed-point division
        ["8.00", "16.0", /^0\.500*$/], // heterogeneous scale fixed-point division
      ];

      for (const [numerator, denominator, expected] of testCases) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        register(`${numerator} / ${denominator} => ${expected}`, () => {
          const a = factory.make(sampleUnit, numerator);
          const b = factory.make(sampleUnit, denominator);
          assert.match(a.relativeTo(b).toDecimalString(), expected);
        });
      }
    });

    describe("negated() method", () => {
      describe("should return the negation of the quantity", function () {
        const register = prepare(this);

        const testCases: [bigint, bigint][] = [
          [8n, -8n],
          [-5n, 5n],
          [0n, 0n],
        ] as const;

        for (const [value, expected] of testCases) {
          register(`negated(${value}) => ${expected}`, () => {
            const a = factory.make(sampleUnit, value);
            const b = factory.make(sampleUnit, expected);
            assertQuantityEquals(a.negated(), b);
          });
        }
      });
    });

    describe("predicates", () => {
      describe("should return true if the quantity is zero", function () {
        const register = prepare(this);

        // prettier-ignore
        const predicates = ["isZero", "isNonZero", "isPositive", "isNegative"] as const;
        type PredicateResults = { [K in (typeof predicates)[number]]: boolean };

        // prettier-ignore
        const testCases: [
          bigint,
          PredicateResults,
          comment?: string,
        ][] = [
          [8n, { isZero: false, isNonZero: true, isPositive: true, isNegative: false }],
          [-5n, { isZero: false, isNonZero: true, isPositive: false, isNegative: true }],
          [0n, { isZero: true, isNonZero: false, isPositive: false, isNegative: false },
             "zero is neither positive nor negative"
          ],
        ] as const;

        for (const predicate of predicates) {
          for (const [value, expected] of testCases) {
            register(`${predicate}(${value}) => ${expected[predicate]}`, () => {
              const a = factory.make(sampleUnit, value);
              assert.strictEqual(a[predicate](), expected[predicate]);
            });
          }
        }
      });
    });

    describe(`quantity invariants`, () => {
      it("should respect plus/minus identity", () => {
        const x = factory.make(sampleUnit, 8n);
        const y = factory.make(sampleUnit, 2n);

        const z = x.plus(y).minus(y);

        assertQuantityEquals(z, x);
      });

      it("should respect negation", () => {
        const x = factory.make(sampleUnit, 10n);
        const zero = x.plus(x.negated());
        assert.isTrue(zero.isZero(), "x + (-x) should be zero");
      });
    });
  });
}
