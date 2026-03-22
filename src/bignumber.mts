import { Decimal as DecimalImplementation } from "decimal.js";
import type { DisplayOptions } from "./displayable.mjs";
import { ValueError } from "./error.mjs";

export function toInteger(src: number | string) {
  const asString = src.toString();
  const asInt = parseInt(asString);

  if (asString != String(asInt)) {
    throw new TypeError(`Can't convert ${src} to an integer`);
  }

  return asInt;
}

//======================================================================
//  BigNumber (fixed-precision arithmetic based on Decimal.js)
//  DEPRECATED: use Fixed instead
//======================================================================

export type BigNumberSource =
  | number
  | string
  | BigNumber
  | DecimalImplementation;

export class BigNumber extends DecimalImplementation.clone({
  rounding: 1, // ROUND_DOWN to ensure truncation, mimicking integer arithmetic behavior
  precision: 80, // 78 decimals are needed to handle full uint256 range without precision loss; 80 adds a safety margin
}) {
  toString(): string {
    return super.toFixed();
  }

  toDisplayString(options: DisplayOptions): string {
    return this.toString();
  }

  static fromInteger(v: number | string): BigNumber {
    return new BigNumber(v);
  }

  static fromString(v: string): BigNumber {
    return new BigNumber(v);
  }

  static from(v: BigNumberSource): BigNumber {
    if (v instanceof BigNumber) {
      return v;
    }

    return new BigNumber(v);
  }

  /**
   * Ensure arithmetic returns the `BigNumber` subclass.
   *
   * `decimal.js` instances can return a base `Decimal` instance for arithmetic
   * operations; we normalize them back to this class so `instanceof BigNumber`
   * remains true for all arithmetic results.
   *
   * This is EXACTLY the reason why we are switching away from `decimal.js` to `Fixed` arithmetic.
   */
  plus(n: DecimalImplementation.Value): this {
    return BigNumber.from(super.plus(n)) as this;
  }

  minus(n: DecimalImplementation.Value): this {
    return BigNumber.from(super.minus(n)) as this;
  }

  mul(n: DecimalImplementation.Value): this {
    return BigNumber.from(super.mul(n)) as this;
  }

  div(n: DecimalImplementation.Value): this {
    return BigNumber.from(super.div(n)) as this;
  }

  negated(): this {
    return BigNumber.from(super.negated()) as this;
  }

  static fromDigits(digits: number | string, precision: number | string) {
    const precisionAsInteger = toInteger(precision);
    if (precisionAsInteger === 0) {
      return this.fromInteger(digits);
    }
    return new BigNumber(digits).div(10 ** precisionAsInteger);
  }

  static E18 = new BigNumber(1e18);
  static ZERO = new BigNumber(0);
}

//======================================================================
//  Fixed (fixed-point arithmetic)
//======================================================================

export const MAX_FIXED_SCALE = 80n;

export type CompareResult = -1 | 0 | 1;

/** Fixed-point pair: `value` is the **unscaled value**; amount is `value × 10^−scale`. */
export type FixedLike = {
  value: bigint;
  scale: bigint;
};
export type FixedSource = bigint | string | FixedLike;
export type IntegerSource = bigint | string | number;

export class Fixed {
  /** Unscaled value; the represented quantity is this integer times `10^-scale`. */
  readonly value: bigint;
  readonly scale: bigint; // Decimal scale

  //--------------------------------------------------------------------
  //  Constants
  //--------------------------------------------------------------------

  static E18 = new Fixed(10n ** 18n, 0n);

  // The `ZERO` constant is ambiguous as any {@link FixedLike} whose unscaled value is 0n is a valid zero.
  static ZERO = new Fixed(0n, 0n);

  //--------------------------------------------------------------------
  //  Constructor and factory methods
  //--------------------------------------------------------------------

  private constructor(value: bigint, scale: bigint) {
    if (scale < 0n || scale > MAX_FIXED_SCALE) {
      throw new RangeError(`Scale must be in the range [0;${MAX_FIXED_SCALE}]`);
    }

    this.value = value;
    this.scale = scale;
  }

  /**
   * Creates a new Fixed from an integer source.
   *
   * The fixed-point result is the exact representation of the input integer
   * without any rounding and with the scale = 0.
   *
   * @param v - The integer source.
   * @returns A new Fixed representing the integer.
   */
  static fromInteger(v: IntegerSource): Fixed {
    return new Fixed(BigInt(v), 0n);
  }

  /**
   * Creates a new Fixed from a string source.
   *
   * The string is parsed as a decimal number.
   * The fixed-point result is the exact representation of the input string
   *  (ignoring leading/trailing whitespace) without any rounding and with the
   * scale = the length of the fractional part (or 0 if there is no fractional part).
   *
   * The method does not understand scientific notation.
   * The number must be expressed as a 10-based finite number.
   *
   * @param v - The string source.
   * @returns A new Fixed representing the string.
   */
  static fromString(v: string): Fixed {
    const match = /^\s*(?<sign>[+-])?(?<int>\d+)(?:\.(?<frac>\d+))?\s*$/.exec(
      v,
    );
    if (!match) {
      throw new SyntaxError(`Cannnot convert ${v} to a Fixed-Point number`);
    }

    const groups = match.groups as {
      sign?: string;
      int: string;
      frac?: string;
    };

    const frac = groups.frac ?? "";
    const digits = `${groups.sign ?? ""}${groups.int}${frac}`;
    return new Fixed(BigInt(digits), BigInt(frac.length));
  }

  static from(v: FixedSource): Fixed {
    if (typeof v === "bigint") {
      return new Fixed(v, 0n);
    }
    if (typeof v === "string") {
      return this.fromString(v);
    }

    return new Fixed(v.value, v.scale);
  }

  /**
   * Quantize a JavaScript double to a {@link Fixed} with exactly `targetScale` fraction digits.
   *
   * The input `v` is interpreted as the exact IEEE-754 double value, and then scaled by `10^targetScale`
   * to compute the integer **unscaled value** of `v × 10^targetScale`.
   * The result is **truncated toward zero** (no “round to nearest” at `10^-targetScale`), matching the
   * truncation semantics of {@link withDecimals} when reducing scale and of integer division in {@link div}.
   *
   * This path avoids {@link Number.prototype.toFixed}, which can return exponential notation for
   * large magnitudes (not accepted by {@link fromString}) and which rounds rather than truncates.
   *
   * @param v - A finite number (`NaN` and `Infinity` are rejected).
   * @param targetScale - Number of digits after the decimal point; must satisfy `0 <= targetScale <= MAX_FIXED_SCALE`.
   */
  static fromNumber(v: number, targetScale: IntegerSource): Fixed {
    if (Number.isNaN(v) || !Number.isFinite(v)) {
      throw new ValueError(`Invalid number: ${v}. Must be a finite number.`);
    }

    const s = BigInt(targetScale);
    if (s < 0n || s > MAX_FIXED_SCALE) {
      throw new RangeError(`Scale must be in the range [0;${MAX_FIXED_SCALE}]`);
    }

    const { sign, mantissa, e2 } = decomposeFiniteDouble(v);

    // Exact identity:
    //   v = sign * mantissa * 2^e2
    // so
    //   v * 10^scale
    // = sign * mantissa * 2^e2 * 2^scale * 5^scale
    // = sign * mantissa * 5^scale * 2^(e2 + scale)
    //
    // If e2 + scale >= 0, the result is already integral.
    // Otherwise divide by 2^(-(e2 + scale)); bigint division truncates toward zero.
    const fivePowScale = 5n ** s;
    const shift2 = e2 + s;

    const signedNumerator = sign * mantissa * fivePowScale;

    const unscaledValue =
      shift2 >= 0n
        ? signedNumerator << shift2
        : signedNumerator / (1n << -shift2);

    return new Fixed(unscaledValue, s);
  }

  /**
   * This value as a JavaScript number: `value × 10^-scale`.
   *
   * Exact only while {@link value} is within `Number.MIN_SAFE_INTEGER`…`Number.MAX_SAFE_INTEGER`;
   * larger unscaled values may lose precision when coerced to `number`.
   */
  toNumber(): number {
    if (this.scale === 0n) {
      return Number(this.value);
    }

    return Number(this.value) / Number(10n ** this.scale);
  }

  /**
   * Initialize a new Fixed from an **unscaled value** and scale.
   *
   * This method performs no conversion.
   * The arguments map directly to the instance's {@link value} and {@link scale}.
   *
   * Do not confuse with the various createXXX factory methods.
   * If you need to create a Fixed from an integral number, you should
   * use {@link fromInteger(v)} instead.
   *
   * @param digits The **unscaled value** (same meaning as {@link value}), as an integer source.
   * @param scale The scale of the Fixed.
   *   This is also the position of the decimal point
   *   (counting from the right) in the unscaled decimal representation.
   * @returns A new Fixed instance.
   */
  static create(digits: IntegerSource, scale: IntegerSource): Fixed {
    const scaleAsBigInt = BigInt(scale); // Will throw if scale is not a valid bigint
    const digitsAsBigInt = BigInt(digits); // Will throw if digits is not a valid bigint

    return new Fixed(digitsAsBigInt, scaleAsBigInt);
  }

  //--------------------------------------------------------------------
  //  Comparison
  //--------------------------------------------------------------------

  /**
   * Total ordering of Fixed values.
   *
   * @param other - The other Fixed to compare against.
   * @returns A negative number if this < other, 0 if this == other, and a positive number if this > other.
   */
  compare(other: FixedLike): CompareResult {
    if (this.value === 0n && other.value === 0n) {
      // Fast path for zero values
      return 0;
    }

    if (this.scale === other.scale) {
      return this.value < other.value ? -1 : this.value > other.value ? 1 : 0;
    }

    if (this.scale > other.scale) {
      const factor = 10n ** BigInt(this.scale - other.scale);
      const bn = other.value * factor;
      return this.value < bn ? -1 : this.value > bn ? 1 : 0;
    } else {
      const factor = 10n ** BigInt(other.scale - this.scale);
      const an = this.value * factor;
      return an < other.value ? -1 : an > other.value ? 1 : 0;
    }
  }

  equals(other: FixedLike): boolean {
    return this.compare(other) === 0;
  }

  isZero(): boolean {
    return this.value === 0n;
  }

  //--------------------------------------------------------------------
  //  Arithmetic
  //--------------------------------------------------------------------

  /**
   * Fixed-point addition.
   *
   * The result is expressed at the higher scale of the two operands.
   */
  plus(other: FixedLike): Fixed {
    const resultScale = this.scale >= other.scale ? this.scale : other.scale;
    const resultValue =
      this.value * 10n ** BigInt(resultScale - this.scale) +
      other.value * 10n ** BigInt(resultScale - other.scale);
    return new Fixed(resultValue, resultScale);
  }

  /**
   * Fixed-point subtraction.
   *
   * The result is expressed at the higher scale of the two operands.
   */
  minus(other: FixedLike): Fixed {
    const resultScale = this.scale >= other.scale ? this.scale : other.scale;
    const resultValue =
      this.value * 10n ** BigInt(resultScale - this.scale) -
      other.value * 10n ** BigInt(resultScale - other.scale);
    return new Fixed(resultValue, resultScale);
  }

  /**
   * Fixed-point multiplication.
   *
   * The result scale is the sum of the receiver's and the other's scales.
   * You can override the result scale by using the {@link requestedScale} parameter.
   *
   * In the code, {@link mul} is mathematically correct by default.
   * If you need domain-specific rounding, either:
   * - use {@link mul} with the {@link requestedScale} parameter,
   * - use {@link mul} followed by {@link Fixed.withDecimals},
   * - or use the domain's {@link scaledBy} method if provided.
   *
   * @param {FixedLike} other The value to multiply by.
   * @param {bigint} [requestedScale] The desired scale for the result. If omitted or equal to the calculated result scale, no rescaling occurs.
   * @returns {Fixed} A new Fixed representing the result of the multiplication.
   */
  mul(other: FixedLike, requestedScale?: bigint): Fixed {
    const resultScale = this.scale + other.scale;
    const resultValue = this.value * other.value;

    if (requestedScale === undefined || requestedScale === resultScale) {
      return new Fixed(resultValue, resultScale);
    }

    if (requestedScale > resultScale) {
      throw new ValueError(
        `Requested scale ${requestedScale} exceeds result scale ${resultScale}`,
      );
    }

    const scaleDown = resultScale - requestedScale;
    const scaledValue = resultValue / 10n ** scaleDown;
    return new Fixed(scaledValue, requestedScale);
  }

  /**
   * Fixed-point division quantized to an explicit result scale.
   *
   * Division has no mathematically privileged default result scale:
   * the exact quotient may require more decimal places than either operand,
   * or may even be non-terminating in base 10.
   *
   * The caller must therefore provide the target scale explicitly.
   * The quotient is then quantized to that scale using integer division,
   * which truncates toward zero in JavaScript / TypeScript `bigint` arithmetic.
   *
   * For domain-specific policies (price scale, ratio scale, token quantity scale, etc.),
   * prefer the domain-level {@link scaledBy} operation that provides sensible defaults.
   *
   * @param other - The divisor.
   * @param targetScale - The scale of the returned quotient.
   * @returns A new Fixed representing `this / other`, quantized to `requestedScale`.
   * @throws {RangeError} If `other` is zero.
   */
  div(other: FixedLike, targetScale: bigint): Fixed {
    if (other.value === 0n) {
      throw new RangeError("Division by zero");
    }

    if (targetScale < 0n) {
      throw new RangeError("Negative scale");
    }

    // We want:
    //   resultValue * 10^-targetScale ≈
    //   (this.value * 10^-this.scale) / (other.value * 10^-other.scale)
    //
    // Therefore:
    //   resultValue ≈ this.value * 10^(targetScale + other.scale - this.scale) / other.value
    //
    // We compute this with integer arithmetic and truncation toward zero.
    const exponent = targetScale + other.scale - this.scale;

    let resultValue: bigint;

    if (exponent >= 0n) {
      const numerator = this.value * 10n ** exponent;
      resultValue = numerator / other.value;
    } else {
      const denominator = other.value * 10n ** -exponent;
      resultValue = this.value / denominator;
    }

    return new Fixed(resultValue, targetScale);
  }
  negated(): Fixed {
    return this.value === 0n ? this : new Fixed(-this.value, this.scale);
  }

  /**
   * Computes the sum of a list of Fixed values.
   *
   * The sum is expressed at the scale of the highest-scale operand.
   * If the list is empty, the result is zero.
   *
   * @param first - The first Fixed value.
   * @param list - The rest of the Fixed values.
   * @returns A new Fixed representing the sum of the values.
   */
  static sum(...list: FixedLike[]): Fixed {
    let acc = Fixed.ZERO;
    for (const other of list) {
      acc = acc.plus(other); // Invariant: after this, acc.scale >= other.scale
    }
    return acc; // Invariant: acc.scale is the highest scale in the list
  }

  //--------------------------------------------------------------------
  //  Rescale
  //--------------------------------------------------------------------

  /**
   * Returns a copy of this value with the given decimal scale.
   * Scales the unscaled value up or down as needed (truncating when reducing scale).
   */
  withDecimals(decimals: bigint): Fixed {
    if (decimals === this.scale) {
      return this;
    }

    if (decimals < this.scale) {
      const scaleDown = this.scale - decimals;
      const scaledValue = this.value / 10n ** scaleDown;
      return new Fixed(scaledValue, decimals);
    }

    const scaleUp = decimals - this.scale;
    const scaledValue = this.value * 10n ** scaleUp;
    return new Fixed(scaledValue, decimals);
  }

  //--------------------------------------------------------------------
  //  String conversion
  //--------------------------------------------------------------------

  toFixed(digits?: number | bigint): string {
    const displayScale =
      digits === undefined
        ? this.scale
        : typeof digits === "bigint"
          ? digits
          : BigInt(toInteger(digits));

    if (displayScale < 0n || displayScale > MAX_FIXED_SCALE) {
      throw new RangeError(
        `digits must be in the range [0;${MAX_FIXED_SCALE}]`,
      );
    }

    // Note: using `withScale` allocates a new `Fixed`. If `toFixed` becomes a hot
    // path, consider inlining the scaling to avoid allocations.
    const displayFixed =
      displayScale === this.scale ? this : this.withDecimals(displayScale);
    const negative = displayFixed.value < 0n;
    const absValue = negative ? -displayFixed.value : displayFixed.value;

    if (displayScale === 0n) {
      return (negative ? "-" : "") + absValue.toString();
    }

    const scaleFactor = 10n ** displayScale;
    const integerPart = absValue / scaleFactor;
    const fractionalPart = absValue % scaleFactor;

    let fractionalString = fractionalPart.toString();
    const expectedLength = Number(displayScale);
    if (fractionalString.length < expectedLength) {
      fractionalString =
        "0".repeat(expectedLength - fractionalString.length) + fractionalString;
    }

    const result = `${integerPart.toString()}.${fractionalString}`;
    return negative ? `-${result}` : result;
  }

  toString(): string {
    return this.toFixed();
  }
}

//======================================================================
//  Utilities
//======================================================================

const F64_FRAC_BITS = 52n;
const F64_FRAC_MASK = (1n << F64_FRAC_BITS) - 1n;
const F64_HIDDEN_BIT = 1n << F64_FRAC_BITS;

/**
 * Decompose a finite IEEE-754 double into sign, mantissa, and exponent such that:
 *
 *   v = sign * mantissa * 2^exponent
 *
 * where:
 * - `sign` is ±1n
 * - `mantissa` is a non-negative integer
 * - `e2` is a signed power-of-two exponent
 */
export function decomposeFiniteDouble(v: number): {
  sign: 1n | -1n;
  mantissa: bigint;
  e2: bigint;
} {
  if (!Number.isFinite(v)) {
    throw new ValueError(`Invalid number: ${v}. Must be a finite number.`);
  }

  // Normalize +0 and -0 to the same exact representation.
  if (v === 0) {
    return { sign: 1n, mantissa: 0n, e2: 0n };
  }

  // Decompose the IEEE-754 double into sign, exponent, and fraction bits.
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, v, false);
  const bits = view.getBigUint64(0, false);

  const sign = ((bits >> 63n) & 1n) === 0n ? 1n : -1n;
  const exponentBits = (bits >> 52n) & 0x7ffn;
  const fractionBits = bits & F64_FRAC_MASK;

  if (exponentBits === 0n) {
    // Subnormal:
    //   v = sign * fractionBits * 2^-52 * 2^-1022
    return {
      sign,
      mantissa: fractionBits,
      e2: -1074n,
    };
  }

  // Normal:
  //   v = sign * (2^52 + fractionBits) * 2^-52 * 2^(exponentBits - 1023)
  return {
    sign,
    mantissa: F64_HIDDEN_BIT | fractionBits,
    e2: exponentBits - 1075n,
  };
}

/**
 * Compatibility layer for migrating from BigNumber to Fixed.
 */
export function fixedFromSource(src: BigNumberSource | FixedSource): Fixed {
  if (src instanceof Fixed) {
    return src;
  }

  if (typeof src === "bigint") {
    return Fixed.create(src, 0n);
  }

  if (typeof src === "string") {
    return Fixed.fromString(src);
  }

  if (typeof src === "object" && "value" in src && "scale" in src) {
    return Fixed.from(src);
  }

  // During the transition from BigNumber to Fixed, we may throw on NaN and Infinity
  // (for number and BigNumber)
  if (typeof src === "number" && (Number.isNaN(src) || !Number.isFinite(src))) {
    throw new ValueError(`Invalid number: ${src}. Must be a finite number.`);
  }
  if (src instanceof BigNumber && (src.isNaN() || !src.isFinite())) {
    throw new ValueError(`Invalid BigNumber: ${src}. Must be a finite number.`);
  }

  const bn = BigNumber.from(src);
  return Fixed.fromString(bn.toString());
}
