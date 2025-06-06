import { Decimal as DecimalImplementation } from "decimal.js";

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
