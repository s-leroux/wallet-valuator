// ========================================================================
//  Dynamic Type Checking
// ========================================================================

import { ValueError } from "./error.mjs";

/**
 * Type that represents any value except undefined.
 * This includes null, primitives, objects, arrays, etc.
 */
export type NotUndefined<T> = T extends undefined ? never : T;

/**
 * Run-time type checks.
 *
 * These functions verify at run-time that a given value is of the expected type,
 * without attempting to convert the value. They return the value unchanged if the check passes.
 * If the value does not match the expected type, a TypeError is thrown.
 */
export class Ensure {
  /**
   * Checks that the provided value is a string.
   *
   * @param obj - The value to test.
   * @returns The same value if it is a string.
   * @throws {TypeError} If the value is not a string.
   */
  static isString(obj: unknown): string {
    const type = typeof obj;
    if (type !== "string") {
      throw new TypeError(`Expected string but got ${type}`);
    }
    return obj as string;
  }

  /**
   * Checks that the provided value is a number.
   *
   * @param obj - The value to test.
   * @returns The same value if it is a number.
   * @throws {TypeError} If the value is not a number.
   */
  static isNumber(obj: unknown): number {
    const type = typeof obj;
    if (type !== "number") {
      throw new TypeError(`Expected number but got ${type}`);
    }
    return obj as number;
  }

  static isDefined<T>(obj: T): NotUndefined<T> {
    if (obj === undefined) {
      throw new ValueError("Expected defined value but got undefined");
    }

    return obj as NotUndefined<T>;
  }
}
