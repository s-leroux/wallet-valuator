import { Decimal as DecimalImplementation } from "decimal.js";
import { InconsistentUnitsError, ValueError } from "./error.mjs";
import type { DisplayOptions } from "./displayable.mjs";

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

export type FixedSource = bigint | string | Fixed;
export type CompareResult = -1 | 0 | 1;

export type FixedLike = {
  value: bigint;
  scale: bigint;
};

export class Fixed {
  readonly value: bigint; // Integer value
  readonly scale: bigint; // Decimal scale

  //--------------------------------------------------------------------
  //  Constants
  //--------------------------------------------------------------------

  static E18 = new Fixed(10n ** 18n, 0n);
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

  static fromInteger(v: number | bigint | string): Fixed {
    return new Fixed(BigInt(v), 0n);
  }

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

    return v;
  }

  static fromDigits(digits: bigint | number | string, scale: bigint | number) {
    const scaleAsBigInt = BigInt(scale);
    if (scaleAsBigInt === 0n) {
      return this.fromInteger(digits);
    }
    return new Fixed(BigInt(digits), scaleAsBigInt);
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
   * This and other must be expressed at the same scale.
   */
  plus(other: FixedLike): Fixed {
    if (this.scale !== other.scale) {
      throw new InconsistentUnitsError(this.scale, other.scale);
    }

    return new Fixed(this.value + other.value, this.scale);
  }

  /**
   * Fixed-point subtraction.
   *
   * This and other must be expressed at the same scale.
   */
  minus(other: FixedLike): Fixed {
    if (this.scale !== other.scale) {
      throw new InconsistentUnitsError(this.scale, other.scale);
    }

    return new Fixed(this.value - other.value, this.scale);
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

  static sum(first: FixedLike, ...rest: FixedLike[]): Fixed {
    // eslint-disable-next-line prefer-const
    let { value, scale } = first;
    for (const other of rest) {
      if (scale !== other.scale) {
        throw new InconsistentUnitsError(scale, other.scale);
      }
      value += other.value;
    }
    return new Fixed(value, scale);
  }

  //--------------------------------------------------------------------
  //  Rescale
  //--------------------------------------------------------------------

  /**
   * Returns a copy of this value with the given decimal scale.
   * Scales the stored value up or down as needed (truncating when reducing scale).
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

/**
 * Compatibility layer for migrating from BigNumber to Fixed.
 */
export function fixedFromSource(src: BigNumberSource | FixedSource): Fixed {
  if (src instanceof Fixed) {
    return src;
  }

  if (typeof src === "bigint") {
    return Fixed.fromDigits(src, 0n);
  }

  const bn = BigNumber.from(src);
  return Fixed.fromString(bn.toString());
}
