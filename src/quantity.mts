import type { Fixed, FixedLike } from "./bignumber.mjs";

export interface Quantity<T, Self extends Quantity<T, Self>> {
  value: Fixed;

  plus(other: Self): Self;
  minus(other: Self): Self;

  negated(): Self;

  /**
   * Returns a new quantity representing this value scaled by a factor.
   *
   * This operation should preserve the quantity's unit.
   * This operation applies domain-specific quantization.
   * The default is to express the result at the scale of the receiver.
   *
   * @param factor - The scalar multiplier.
   * @returns A new quantity with the same unit and scale.
   */
  scaledBy(factor: FixedLike): Self;

  /**
   * Returns the scalar ratio between this quantity and a base quantity.
   *
   * In other words, it answers: "By which factor must the base be multiplied
   * to yield this value?"
   *
   * The result is expressed as a dimensionless quantity whose scale is
   * implemenation-dependent but should be greater than or equal to the
   * scale of the receiver and the base.
   *
   * @param base - The reference quantity to compare against.
   * @returns The scalar ratio (this / base).
   * @throws {InconsistentUnitsError} If the units differ.
   */
  relativeTo(base: Self): Fixed;

  isZero(): boolean;
}
