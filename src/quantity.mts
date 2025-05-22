import type { BigNumberSource, BigNumber } from "./bignumber.mjs";

export interface Quantity<T, Self extends Quantity<T, Self>> {
  value: BigNumber;

  plus(other: Self): Self;
  minus(other: Self): Self;

  negated(): Self;

  /**
   * Returns a new quantity representing this value scaled by a given factor.
   *
   * This is useful for proportional allocations or applying percentages.
   *
   * @param factor - The scalar multiplier.
   * @returns A new quantity with the same unit and scaled value.
   */
  scaledBy(factor: BigNumberSource): Self;

  /**
   * Returns the scalar ratio between this quantity and a base quantity.
   *
   * In other words, it answers: "By which factor must the base be multiplied
   * to yield this value?"
   *
   * @param base - The reference quantity to compare against.
   * @returns The scalar ratio (this / base).
   * @throws {InconsistentUnitsError} If the units differ.
   */
  relativeTo(base: Self): BigNumber;

  isZero(): boolean;
}
