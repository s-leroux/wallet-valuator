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

export const MAX_FIXED_SCALE = 80n;

export class Fixed {
  readonly value: bigint;
  readonly scale: bigint;

  constructor(value: bigint, scale: bigint) {
    if (scale < 0n || scale > MAX_FIXED_SCALE) {
      throw new RangeError(`Scale must be in the range [0;${MAX_FIXED_SCALE}]`);
    }

    this.value = value;
    this.scale = scale;
  }

  plus(other: Fixed): Fixed {
    if (this.scale !== other.scale) {
      throw new InconsistentUnitsError(this.scale, other.scale);
    }

    return new Fixed(this.value + other.value, this.scale);
  }

  minus(other: Fixed): Fixed {
    if (this.scale !== other.scale) {
      throw new InconsistentUnitsError(this.scale, other.scale);
    }

    return new Fixed(this.value - other.value, this.scale);
  }

  mul(other: Fixed, scale?: bigint): Fixed {
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

  div(other: Fixed): Fixed {
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

  /**
   * Returns a copy of this value with the given decimal scale.
   * Scales the stored value up or down as needed (truncating when reducing scale).
   */
  withScale(scale: bigint): Fixed {
    if (scale === this.scale) {
      return this;
    }

    if (scale < this.scale) {
      const scaleDown = this.scale - scale;
      const scaledValue = this.value / 10n ** scaleDown;
      return new Fixed(scaledValue, scale);
    }

    const scaleUp = scale - this.scale;
    const scaledValue = this.value * 10n ** scaleUp;
    return new Fixed(scaledValue, scale);
  }

  toFixed(): string {
    const negative = this.value < 0n;
    const absValue = negative ? -this.value : this.value;

    if (this.scale === 0n) {
      return (negative ? "-" : "") + absValue.toString();
    }

    const scaleFactor = 10n ** this.scale;
    const integerPart = absValue / scaleFactor;
    const fractionalPart = absValue % scaleFactor;

    let fractionalString = fractionalPart.toString();
    const expectedLength = Number(this.scale);
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
