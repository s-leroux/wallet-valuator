import { BigNumber } from "./bignumber.mjs";

type CurrencyLike = Pick<Currency, "symbol" | "decimal">;

class InconsistentCurrencyError extends TypeError {
  constructor(a: object, b: object) {
    super(`Inconsistent Currency Error: ${a} and ${b}`);
  }
}

/**
 * Represents an amount of a currency expressed in its display unit.
 *
 * The `Amount` class associates a specific currency with a value,
 * making it easier to handle monetary operations and display amounts
 * in a human-readable format.
 */
export class Amount {
  currency: CurrencyLike;
  value: BigNumber;

  /**
   * Creates an instance of `Amount`.
   *
   * @param currency - The currency associated with the amount.
   * @param value - The value of the amount expressed in the display unit.
   */
  constructor(currency: CurrencyLike, value?: BigNumber) {
    this.currency = currency;
    this.value = value ?? BigNumber.ZERO;
  }

  /**
   * Returns a string representation of the amount.
   *
   * @returns A string combining the value and the currency symbol.
   * @example
   * const amount = new Amount({ symbol: 'ETH', ... }, BigNumber.from(1));
   * console.log(amount.toString()); // "1 ETH"
   */
  toString(): string {
    return `${this.value} ${this.currency.symbol}`;
  }

  /**
   * Returns a new `Amount` representing the sum of the current instance and the specified `other` amount.
   *
   * This method ensures that both amounts share the same currency before performing the addition.
   * If the currencies are inconsistent, an `InconsistentCurrencyError` is thrown.
   *
   * @param other - The `Amount` to add to the current instance.
   * @returns A new `Amount` object with the same currency and the combined value.
   * @throws {InconsistentCurrencyError} If the currencies of the two amounts are not the same.
   */
  plus(other: Amount): Amount {
    const currency = this.currency;
    if (other.currency !== currency) {
      throw new InconsistentCurrencyError(this, other);
    }

    return new Amount(currency, this.value.plus(other.value));
  }

  /**
   * Returns a new `Amount` representing the difference between the current instance and the specified `other` amount.
   *
   * This method ensures that both amounts share the same currency before performing the subtraction.
   * If the currencies are inconsistent, an `InconsistentCurrencyError` is thrown.
   *
   * @param other - The `Amount` to subtract from the current instance.
   * @returns A new `Amount` object with the same currency and the resulting value.
   * @throws {InconsistentCurrencyError} If the currencies of the two amounts are not the same.
   */
  minus(other: Amount): Amount {
    const currency = this.currency;
    if (other.currency !== currency) {
      throw new InconsistentCurrencyError(this, other);
    }

    return new Amount(currency, this.value.minus(other.value));
  }
}

/**
 * Represents a currency, such as an ERC20 token.
 *
 * The `address` field is assumed to be unique within a single blockchain (`chain`).
 * To reduce coupling and simplify testing, the blockchain is identified by its name
 * rather than referencing an object that represents the chain directly. The chain name
 * is expected to be unique across the global namespace.
 *
 * The `name` and `symbol` fields are intended for presentation purposes and should not
 * be relied upon as unique identifiers for a currency. Many ERC20 tokens may share the
 * same name or symbol, either due to mistakes or malicious intent.
 *
 * On the blockchain, values are stored as integers expressed in the currency's base unit.
 * The `decimal` field indicates the number of decimal places (in base 10) to shift in
 * order to convert a value to a human-readable format.
 */
export class Currency {
  readonly name: string;
  readonly symbol: string;
  readonly decimal: number;

  /**
   * Creates an instance of `Currency`.
   *
   * @param name - The human-readable name of the currency.
   * @param symbol - The symbol used to represent the currency (e.g., "ETH").
   * @param decimal - The number of decimal places used for the currency.
   */
  constructor(name: string, symbol: string, decimal: number) {
    this.name = name;
    this.symbol = symbol;
    this.decimal = decimal;
  }

  /**
   * Converts a value expressed in the base unit to an `Amount` in the display unit.
   *
   * @param baseunit - A string representing the value in the currency's base unit.
   * @returns An `Amount` object representing the value in the display unit.
   * @example
   * const eth = new Currency('Ethereum', '0x...', 'Ether', 'ETH', 18);
   * const amount = eth.fromBaseUnit('1000000000000000000'); // 1 ETH
   * console.log(amount.toString()); // "1 ETH"
   */
  fromBaseUnit(baseunit: string): Amount {
    return new Amount(this, BigNumber.fromDigits(baseunit, this.decimal));
  }

  toString(): string {
    return `${this.symbol}`;
  }
}
