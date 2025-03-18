// ========================================================================
//  Dynamic Type Checking
// ========================================================================

/**
 * Run-time type checks.
 *
 * These functions verify at run-time that a given value is of the expected type,
 * without attempting to convert the value. They return the value unchanged if the check passes.
 * If the value does not match the expected type, a TypeError is thrown.
 */
export const Ensure = {
  // @ts-ignore
  __proto__: null,

  /**
   * Checks that the provided value is a string.
   *
   * @param obj - The value to test.
   * @returns The same value if it is a string.
   * @throws {TypeError} If the value is not a string.
   */
  isString(obj: any): string {
    const type = typeof obj;
    if (type !== "string") {
      throw new TypeError(`Expected string but got ${type}`);
    }
    return obj;
  },

  /**
   * Checks that the provided value is a number.
   *
   * @param obj - The value to test.
   * @returns The same value if it is a number.
   * @throws {TypeError} If the value is not a number.
   */
  isNumber(obj: any): number {
    const type = typeof obj;
    if (type !== "number") {
      throw new TypeError(`Expected number but got ${type}`);
    }
    return obj;
  },
};
