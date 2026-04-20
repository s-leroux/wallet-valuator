import type { CompareResult, Fixed, FixedSource } from "./bignumber.mjs";

/**
 * A quantity is a value with a unit.
 *
 * This interface describe the common operation every quantity must implement.
 *
 * To check if an implementation repects the invariants, you can use the
 * {@link testQuantityInterface} helper.
 */
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
  scaledBy(factor: FixedSource): Self;

  /**
   * Returns the scalar ratio between this quantity and a base quantity.
   *
   * In other words, it answers: "By which factor must the base be multiplied
   * to yield this value?"
   *
   * The result is expressed as a dimensionless quantity whose scale is
   * implementation-dependent, but should typically be chosen with enough
   * decimal digits to preserve (quantized) invertibility via {@link scaledBy}.
   *
   * @param base - The reference quantity to compare against.
   * @returns The scalar ratio (this / base).
   * @throws {InconsistentUnitsError} If the units differ.
   */
  relativeTo(base: Self): Fixed;

  compare(other: Self): CompareResult;

  /**
   * Returns true if the quantity is zero.
   */
  isZero(): boolean;

  /**
   * Returns true if the quantity is non-zero.
   */
  isNonZero(): boolean;

  /**
   * Returns true if the quantity is strictly positive.
   *
   * Note that zero is not considered positive.
   */
  isPositive(): boolean;

  /**
   * Returns true if the quantity is strictly negative.
   *
   * Note that zero is not considered negative.
   */
  isNegative(): boolean;
}
