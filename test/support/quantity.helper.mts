import { assert } from "chai";
import { Quantity } from "../../src/quantity.mjs";
import { InconsistentUnitsError } from "../../src/error.mjs";

/** Factory for creating and comparing quantities */
type QuantityFactory<Unit, Q extends Quantity<Unit, Q>> = {
  /** Creates a new quantity with the given unit and value */
  make(unit: Unit, value: number): Q;
  /** Checks if two quantities have the same unit */
  unitEquals(a: Q, b: Q): boolean;
};

export function testQuantityInterface<Unit, Q extends Quantity<Unit, Q>>(
  factory: QuantityFactory<Unit, Q>,
  sampleUnit: Unit,
  otherUnit: Unit
) {
  function assertQuantityEquals(a: Q, b: Q) {
    assert(
      factory.unitEquals(a, b),
      `Expected units to be equal (${a} vs ${b})`
    );
    assert(
      a.value.equals(b.value),
      `Expected values to be equal (${a} vs ${b})`
    );
  }

  describe(`implements the quantity interface`, () => {
    describe("plus() method", () => {
      it("should return the sum of two quantities", () => {
        const a = factory.make(sampleUnit, 8);
        const b = factory.make(sampleUnit, 2);
        const c = factory.make(sampleUnit, 10);

        assertQuantityEquals(a.plus(b), c);
      });

      it("should throw if units are inconsistent on plus", () => {
        const x = factory.make(sampleUnit, 1);
        const y = factory.make(otherUnit, 1);

        assert.throws(() => x.plus(y), InconsistentUnitsError);
      });
    });

    describe("minus() method", () => {
      it("should return the difference between two quantities", () => {
        const a = factory.make(sampleUnit, 8);
        const b = factory.make(sampleUnit, 2);
        const c = factory.make(sampleUnit, 6);

        assertQuantityEquals(a.minus(b), c);
      });

      it("should throw if units are inconsistent on minus", () => {
        const x = factory.make(sampleUnit, 1);
        const y = factory.make(otherUnit, 1);

        assert.throws(() => x.minus(y), InconsistentUnitsError);
      });
    });

    describe("scaledBy() method", () => {
      it("should scale the quantity", () => {
        const a = factory.make(sampleUnit, 8);
        const b = factory.make(sampleUnit, 80);

        assertQuantityEquals(a.scaledBy(10), b);
      });
    });

    describe("relativeTo() method", () => {
      it("should return the ratio between two quantities", () => {
        const a = factory.make(sampleUnit, 8);
        const b = factory.make(sampleUnit, 16);

        assert.equal(a.relativeTo(b).toString(), "0.5");
      });
    });

    describe(`quantity invariants`, () => {
      it("should respect plus/minus identity", () => {
        const x = factory.make(sampleUnit, 8);
        const y = factory.make(sampleUnit, 2);

        const z = x.plus(y).minus(y);

        assertQuantityEquals(z, x);
      });

      it("should respect negation", () => {
        const x = factory.make(sampleUnit, 10);
        const zero = x.plus(x.negated());
        assert.isTrue(zero.isZero(), "x + (-x) should be zero");
      });
    });
  });
}
