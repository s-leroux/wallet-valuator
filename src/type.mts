// ========================================================================
//  Dynamic Type Checking
// ========================================================================

import { ErrorCode } from "./errcode.mjs";
import { ValueError } from "./error.mjs";
import { Logged } from "./errorutils.mjs";

/**
 * Type that represents any value except undefined.
 * This includes null, primitives, objects, arrays, etc.
 */
export type NotUndefined<T> = T extends undefined ? never : T;

/**
 * Alternative implementation of the {@link Ensure} class for run-time type checking.
 *
 * It is more verbose but provides more control over the error message and uses the
 * {@link Logged} function to log the error.
 *
 * It is not obvious that `EnsureNG` in really better in practice than `Ensure`.
 * Notably `EnsureNG` log all error messages as comming from  the {@link errorutils.mjs} module,
 * a known limitation of the {@link logger} function.
 */
export class EnsureNG {
  // 1. Default message
  static isDefined<T>(
    errCode: ErrorCode,
    x: T | undefined,
  ): asserts x is NotUndefined<T>;

  // 2. Custom message
  static isDefined<T>(
    errCode: ErrorCode,
    x: T | undefined,
    message: string,
  ): asserts x is NotUndefined<T>;

  // 3. Custom error
  static isDefined<T, E extends Error, R extends unknown[]>(
    errCode: ErrorCode,
    x: T | undefined,
    ctor: new (...rest: R) => E,
    ...rest: R
  ): asserts x is NotUndefined<T>;

  // Implementation
  static isDefined<T, E extends Error, R extends unknown[]>(
    errCode: ErrorCode,
    x: T | undefined,
    ctor?: (new (...rest: R) => E) | string,
    ...rest: R
  ): asserts x is NotUndefined<T> {
    if (x !== undefined) return;

    if (typeof ctor === "string") {
      throw Logged(errCode, ValueError, ctor);
    }
    if (ctor) {
      throw Logged(errCode, ctor, ...rest);
    }
    throw Logged(
      errCode,
      ValueError,
      "Expected a defined value but got undefined",
    );
  }

  // 1. Default message
  static isTrue(errCode: ErrorCode, x: boolean): asserts x is true;

  // 2. Custom message
  static isTrue(
    errCode: ErrorCode,
    x: boolean,
    message: string,
  ): asserts x is true;

  // 3. Custom error
  static isTrue<E extends Error, R extends unknown[]>(
    errCode: ErrorCode,
    x: boolean,
    ctor: new (...rest: R) => E,
    ...rest: R
  ): asserts x is true;

  // Implementation
  static isTrue<E extends Error, R extends unknown[]>(
    errCode: ErrorCode,
    x: boolean,
    ctor?: (new (...rest: R) => E) | string,
    ...rest: R
  ): asserts x is true {
    if (x) return;

    if (typeof ctor === "string") {
      throw Logged(errCode, ValueError, ctor);
    }
    if (ctor) {
      throw Logged(errCode, ctor, ...rest);
    }
    throw Logged(
      errCode,
      ValueError,
      `Expected a true value but got ${String(x)}`,
    );
  }
}

/**
 * Run-time type checks.
 *
 * These functions verify at run-time that a given value is of the expected type,
 * without attempting to convert the value. They return the value unchanged if the check passes.
 * If the value does not match the expected type, a TypeError is thrown.
 *
 * The class was **not** obsoleted by {@link EnsureNG} and you may continue to use it
 * in new code, or enhance it with more type checks.
 *
 * ```typescript
 * function myFunction(param: unknown) {
 *   const paramAsString = Ensure.isString(param);
 *   ...
 * }
 * ```
 */
export class Ensure {
  /**
   * Checks that the provided value is a string.
   *
   * @param obj - The value to test.
   * @returns The same value if it is a string.
   * @throws {TypeError} If the value is not a string.
   */
  static isString(this: void, obj: unknown): string {
    const type = typeof obj;
    if (type !== "string") {
      throw new TypeError(`Expected string but got ${type}`);
    }
    return obj as string;
  }

  /**
   * Checks that the provided value is an array.
   *
   * @param obj - The value to test.
   * @returns The same value if it is an array.
   * @throws {TypeError} If the value is not an array.
   */
  static isArray(this: void, obj: unknown): unknown[] {
    if (!Array.isArray(obj)) {
      throw new TypeError(`Expected array but got ${typeof obj}`);
    }
    return obj as unknown[];
  }

  /**
   * Checks that the provided value is an array of strings.
   *
   * @param obj - The value to test.
   * @returns The same value if it is an array of strings.
   * @throws {TypeError} If the value is not an array of strings.
   */
  static isStringArray(this: void, obj: unknown): string[] {
    const array = Ensure.isArray(obj);
    for (const item of array) {
      Ensure.isString(item);
    }
    return array as string[];
  }

  /**
   * Checks that the provided value is a number.
   *
   * @param obj - The value to test.
   * @returns The same value if it is a number.
   * @throws {TypeError} If the value is not a number.
   */
  static isNumber(this: void, obj: unknown): number {
    const type = typeof obj;
    if (type !== "number") {
      throw new TypeError(`Expected number but got ${type}`);
    }
    return obj as number;
  }

  static isDefined<T>(this: void, obj: T | undefined): NotUndefined<T> {
    if (obj === undefined) {
      throw new ValueError("Expected defined value but got undefined");
    }

    return obj as NotUndefined<T>;
  }

  static isNonEmptyString(this: void, obj: unknown): string {
    const type = typeof obj;
    if (type !== "string" || obj === "") {
      throw new TypeError(`Expected a non-empty string but got ${obj}`);
    }
    return obj as string;
  }

  static ownsProperty<T>(this: void, obj: T, property: string): T {
    if (typeof obj !== "object" || obj === null) {
      throw new TypeError(`Expected object but got ${typeof obj}`);
    }

    if (!Object.prototype.hasOwnProperty.call(obj, property)) {
      throw new TypeError(`Object does not have property "${property}"`);
    }
    return obj as T;
  }
}
