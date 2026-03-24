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
   * Creates a new Fixed from a decimal string source.
   *
   * The string is parsed as a base-10 finite number, optionally using scientific notation.
   *
   * Without `targetScale`, the result is the exact decimal value represented by the string,
   * normalized to a non-negative Fixed scale:
   * - `"123"`      -> `Fixed(123, 0)`
   * - `"1.23"`     -> `Fixed(123, 2)`
   * - `"1.23e2"`   -> `Fixed(123, 0)`
   * - `"1.23e-2"`  -> `Fixed(123, 4)`
   *
   * With `targetScale`, the parsed decimal value is quantized to exactly that scale:
   * - if the parsed value has more fractional digits, it is truncated toward zero;
   * - if it has fewer fractional digits, it is scaled up as if padded with trailing zeros.
   *
   * Examples:
   * - `fromString("123.456", 2)` -> `Fixed(12345, 2)`
   * - `fromString("123.4",   3)` -> `Fixed(123400, 3)`
   * - `fromString("1.23e-2", 4)` -> `Fixed(123, 4)`
   *
   * @param v - The string source.
   * @param targetScale - Optional target number of digits after the decimal point.
   * @returns A new Fixed representing the parsed decimal value.
   */
  static fromString(v: string, targetScale?: IntegerSource): Fixed {
    const match =
      /^\s*(?<sign>[+-])?(?<int>\d+)(?:\.(?<frac>\d+))?(?:[eE](?<exp>[+-]?\d+))?\s*$/.exec(
        v,
      );
    if (!match) {
      throw new SyntaxError(`Cannnot convert ${v} to a Fixed-Point number`);
    }

    const groups = match.groups as {
      sign?: string;
      int: string;
      frac?: string;
      exp?: string;
    };

    const frac = groups.frac ?? "";
    const exponent10 = BigInt(groups.exp ?? "0");
    const digitsText = `${groups.sign ?? ""}${groups.int}${frac}`;
    const digits = BigInt(digitsText);

    // Parsed decimal value:
    //   digits × 10^-(frac.length) × 10^(exponent10)
    // = digits × 10^-(frac.length - exponent10)
    //
    // So `parsedScale` is the exact decimal scale of `digits`.
    // It may be negative for strings like "1e3".
    const parsedScale = BigInt(frac.length) - exponent10;

    if (targetScale === undefined) {
      if (parsedScale <= 0n) {
        return new Fixed(digits * 10n ** -parsedScale, 0n);
      }

      return new Fixed(digits, parsedScale);
    }

    const s = BigInt(targetScale);
    if (s < 0n || s > MAX_FIXED_SCALE) {
      throw new RangeError(`Scale must be in the range [0;${MAX_FIXED_SCALE}]`);
    }

    // Quantize to exactly `s` fraction digits.
    //
    // If s >= parsedScale, scale up (equivalent to decimal zero-padding).
    // If s < parsedScale, scale down by truncating toward zero.
    const shift = s - parsedScale;
    const unscaledValue =
      shift >= 0n ? digits * 10n ** shift : digits / 10n ** -shift;

    return new Fixed(unscaledValue, s);
  }

  /**
   * Quantize a JavaScript number to a {@link Fixed} with exactly `targetScale` fraction digits.
   *
   * The number is first converted to its standard decimal textual form using
   * {@link Number.prototype.toString}. That decimal value is then quantized to
   * `targetScale` using truncation toward zero.
   *
   * This is intentionally a decimal-text adaptation path for external JavaScript
   * numbers (for example JSON numeric payloads), not a bit-exact IEEE-754 conversion.
   *
   * Scientific notation produced by {@link Number.prototype.toString} is accepted.
   *
   * @param v - A finite number (`NaN` and `Infinity` are rejected).
   * @param targetScale - Number of digits after the decimal point; must satisfy
   *   `0 <= targetScale <= MAX_FIXED_SCALE`.
   * @returns A new Fixed representing the decimal value of `v.toString()`,
   *   quantized to `targetScale`.
   */
  static fromNumber(v: number, targetScale: IntegerSource): Fixed {
    if (!Number.isFinite(v)) {
      throw new ValueError(`Invalid number: ${v}. Must be a finite number.`);
    }

    return this.fromString(v.toString(), targetScale);
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
  //  Conversions
  //--------------------------------------------------------------------

  /**
   * This value as a JavaScript number: `value × 10^-scale`.
   *
   * This conversion may lose precision because JavaScript numbers are IEEE-754
   * doubles. Prefer {@link toString} when you need a canonical decimal representation.
   *
   * Exact only while {@link value} is within `Number.MIN_SAFE_INTEGER`…`Number.MAX_SAFE_INTEGER`;
   * larger unscaled values may lose precision when coerced to `number`.
   */
  toNumber(): number {
    return Number(this.toDecimalString());
  }

  /**
   * Canonical base-10 decimal string for this fixed-point value.
   *
   * Without `fractionDigits`, the string uses this instance’s stored {@link scale}
   * (same as {@link toString}).
   *
   * With `fractionDigits`, the value is first expressed at exactly that many
   * digits after the decimal point: if **smaller** than the stored scale, the
   * unscaled value is **truncated toward zero** via {@link withDecimals} (same
   * quantization policy as {@link mul} with `requestedScale` and {@link div}).
   * If **larger**, the value is padded with trailing fractional zeros.
   *
   * This is **not** {@link Number.prototype.toFixed}: JavaScript’s `toFixed`
   * rounds to nearest; `toDecimalString` truncates when reducing precision.
   *
   * @param digits - Optional number of digits after the decimal point.
   *   Must satisfy `0 <= fractionDigits <= MAX_FIXED_SCALE`.
   */
  toDecimalString(digits?: number | bigint): string {
    const displayScale =
      digits === undefined
        ? this.scale
        : typeof digits === "bigint"
          ? digits
          : BigInt(toInteger(digits));

    if (displayScale < 0n || displayScale > MAX_FIXED_SCALE) {
      throw new RangeError(
        `fractionDigits must be in the range [0;${MAX_FIXED_SCALE}]`,
      );
    }

    // Note: using `withDecimals` allocates a new `Fixed`. If `toFixed` becomes a hot
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
    return this.toDecimalString();
  }
}

//======================================================================
//  Utilities
//======================================================================

/**
 * Compatibility layer for migrating from BigNumber to Fixed.
 */
export function fixedFromSource(src: FixedSource): Fixed {
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

  throw new TypeError(`Invalid Fixed source: ${src}`);
}
