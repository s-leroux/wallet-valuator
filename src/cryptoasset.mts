import { BigNumber } from "./bignumber.mjs";

class InconsistentCryptoAssetError extends TypeError {
  // XXX Replace by "InconsistenUnitError" in errors.mts
  constructor(a: object, b: object) {
    super(`Inconsistent CryptoAsset Error: ${a} and ${b}`);
  }
}

/**
 * Represents an amount of a CryptoAsset expressed in its display unit.
 *
 * The `Amount` class associates a specific crypto with a value,
 * making it easier to handle monetary operations and display amounts
 * in a human-readable format.
 */
export class Amount {
  crypto: CryptoAsset;
  value: BigNumber;

  /**
   * Creates an instance of `Amount`.
   *
   * @param crypto - The crypto associated with the amount.
   * @param value - The value of the amount expressed in the display unit.
   */
  constructor(crypto: CryptoAsset, value?: BigNumber) {
    this.crypto = crypto;
    this.value = value ?? BigNumber.ZERO;
  }

  /**
   * Returns a string representation of the amount.
   *
   * @returns A string combining the value and the crypto symbol.
   * @example
   * const amount = new Amount({ symbol: 'ETH', ... }, BigNumber.from(1));
   * console.log(amount.toString()); // "1 ETH"
   */
  toString(): string {
    return `${this.value} ${this.crypto.symbol}`;
  }

  /**
   * Returns a new `Amount` representing the sum of the current instance and the specified `other` amount.
   *
   * This method ensures that both amounts share the same crypto before performing the addition.
   * If the currencies are inconsistent, an `InconsistentCryptoAssetError` is thrown.
   *
   * @param other - The `Amount` to add to the current instance.
   * @returns A new `Amount` object with the same crypto and the combined value.
   * @throws {InconsistentCryptoAssetError} If the currencies of the two amounts are not the same.
   */
  plus(other: Amount): Amount {
    const crypto = this.crypto;
    if (other.crypto !== crypto) {
      throw new InconsistentCryptoAssetError(this, other);
    }

    return new Amount(crypto, this.value.plus(other.value));
  }

  /**
   * Returns a new `Amount` representing the difference between the current instance and the specified `other` amount.
   *
   * This method ensures that both amounts share the same crypto before performing the subtraction.
   * If the currencies are inconsistent, an `InconsistentCryptoAssetError` is thrown.
   *
   * @param other - The `Amount` to subtract from the current instance.
   * @returns A new `Amount` object with the same crypto and the resulting value.
   * @throws {InconsistentCryptoAssetError} If the currencies of the two amounts are not the same.
   */
  minus(other: Amount): Amount {
    const crypto = this.crypto;
    if (other.crypto !== crypto) {
      throw new InconsistentCryptoAssetError(this, other);
    }

    return new Amount(crypto, this.value.minus(other.value));
  }
}

/**
 * Represents a crypto, such as an ERC20 token.
 *
 * The `address` field is assumed to be unique within a single blockchain (`chain`).
 * To reduce coupling and simplify testing, the blockchain is identified by its name
 * rather than referencing an object that represents the chain directly. The chain name
 * is expected to be unique across the global namespace.
 *
 * The `name` and `symbol` fields are intended for presentation purposes and should not
 * be relied upon as unique identifiers for a crypto. Many ERC20 tokens may share the
 * same name or symbol, either due to mistakes or malicious intent.
 *
 * On the blockchain, values are stored as integers expressed in the crypto's base unit.
 * The `decimal` field indicates the number of decimal places (in base 10) to shift in
 * order to convert a value to a human-readable format.
 */
export class CryptoAsset {
  readonly id: string; // internal id for that asset cross-chain
  readonly name: string;
  readonly symbol: string;
  readonly decimal: number;

  /**
   * Creates an instance of `CryptoAsset`.
   *
   * @param name - The human-readable name of the crypto.
   * @param symbol - The symbol used to represent the crypto (e.g., "ETH").
   * @param decimal - The number of decimal places used for the crypto.
   */
  constructor(id: string, name: string, symbol: string, decimal: number) {
    this.id = id;
    this.name = name;
    this.symbol = symbol;
    this.decimal = decimal;
  }

  /**
   * Converts a value expressed in the base unit to an `Amount` in the display unit.
   *
   * @param baseunit - A string representing the value in the crypto's base unit.
   * @returns An `Amount` object representing the value in the display unit.
   * @example
   * const eth = new CryptoAsset('Ethereum', '0x...', 'Ether', 'ETH', 18);
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
