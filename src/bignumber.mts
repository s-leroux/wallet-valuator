import { Decimal as DecimalImplementation } from "decimal.js";

export function toInteger(src: number | string) {
  const result = parseInt(src.toString());

  if (src != result) {
    throw new TypeError(`Can't convert ${src} to an integer`);
  }

  return result;
}

export type BigNumberSource = number | string | DecimalImplementation;

export class BigNumber extends DecimalImplementation {
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
