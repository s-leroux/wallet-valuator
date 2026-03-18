declare module "decimal.js" {
  interface Decimal {
    negated(): this;
    plus(n: Decimal.Value): this;
    minus(n: Decimal.Value): this;
    div(n: Decimal.Value): this;
    mul(n: Decimal.Value): this;
  }
}

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

  //--------------------------------------------------------------------
  //  Arithmetic
  //--------------------------------------------------------------------

  plus(other: FixedLike): Fixed {
    if (this.scale !== other.scale) {
      throw new InconsistentUnitsError(this.scale, other.scale);
    }

    return new Fixed(this.value + other.value, this.scale);
  }

  minus(other: FixedLike): Fixed {
    if (this.scale !== other.scale) {
      throw new InconsistentUnitsError(this.scale, other.scale);
    }

    return new Fixed(this.value - other.value, this.scale);
  }

  mul(other: FixedLike, scale?: bigint): Fixed {
    const resultScale = this.scale + other.scale;
    const resultValue = this.value * other.value;

    if (scale === undefined || scale === resultScale) {
      return new Fixed(resultValue, resultScale);
    }

    if (scale > resultScale) {
      throw new ValueError(
        `Requested scale ${scale} exceeds result scale ${resultScale}`,
      );
    }

    const scaleDown = resultScale - scale;
    const scaledValue = resultValue / 10n ** scaleDown;
    return new Fixed(scaledValue, scale);
  }

  div(other: FixedLike): Fixed {
    if (other.value === 0n) {
      throw new RangeError("Division by zero");
    }

    const resultScale = this.scale;
    const scaleFactor = 10n ** other.scale;
    const numerator = this.value * scaleFactor;
    const resultValue = numerator / other.value;

    return new Fixed(resultValue, resultScale);
  }

  negated(): Fixed {
    return new Fixed(-this.value, this.scale);
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
