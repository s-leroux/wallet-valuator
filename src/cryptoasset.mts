import { BigNumber, BigNumberSource } from "./bignumber.mjs";
import { Price } from "./price.mjs";
import { FiatCurrency } from "./fiatcurrency.mjs";
import { InconsistentUnitsError } from "./error.mjs";

import { register } from "./debug.mjs";

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
   * If the currencies are inconsistent, an `InconsistentUnitsError` is thrown.
   *
   * @param other - The `Amount` to add to the current instance.
   * @returns A new `Amount` object with the same crypto and the combined value.
   * @throws {InconsistentUnitsError} If the currencies of the two amounts are not the same.
   */
  plus(other: Amount): Amount {
    const crypto = this.crypto;
    if (other.crypto !== crypto) {
      throw new InconsistentUnitsError(this, other);
    }

    return new Amount(crypto, this.value.plus(other.value));
  }

  /**
   * Returns a new `Amount` representing the difference between the current instance and the specified `other` amount.
   *
   * This method ensures that both amounts share the same crypto before performing the subtraction.
   * If the currencies are inconsistent, an `InconsistentUnitsError` is thrown.
   *
   * @param other - The `Amount` to subtract from the current instance.
   * @returns A new `Amount` object with the same crypto and the resulting value.
   * @throws {InconsistentUnitsError} If the currencies of the two amounts are not the same.
   */
  minus(other: Amount): Amount {
    const crypto = this.crypto;
    if (other.crypto !== crypto) {
      throw new InconsistentUnitsError(this, other);
    }

    return new Amount(crypto, this.value.minus(other.value));
  }
}

/**
 * Represents a crypto-asset, such as a native coin or an ERC-20 token.
 *
 * A `CryptoAsset` is a logical representation of a crypto-asset, independent of
 * the underlying blockchain. For example, it may represent "USDC" regardless
 * of the blockchain on which it exists, encompassing both the authentic
 * Circle-issued token and bridged versions. From an accounting perspective,
 * these are all considered a single crypto-asset.
 *
 * The `id` is a unique internal identifier for the logical crypto-asset.
 * A **crypto-asset resolver** is responsible for mapping blockchain-specific
 * or asset-specific data to a logical crypto-asset. For example, an Ethereum
 * crypto-asset resolver may use a smart contract address and an internal
 * database to associate a concrete ERC-20 token transfer with its corresponding
 * logical crypto-asset. Resolvers for other blockchains may map different
 * smart contract addresses to the same logical asset.
 *
 * The `name` and `symbol` fields are intended for presentation purposes only
 * and should not be relied upon as unique identifiers. Many ERC-20 tokens
 * may share the same name or symbol, either due to mistakes or malicious intent.
 *
 * On the blockchain, values are stored as integers in the asset's base unit.
 * The `decimal` field indicates the number of decimal places (digits in base 10)
 * required to convert a raw value into a human-readable format.
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
   *
   * ISSUE #68 Make the constructor private and provide a CryptoAsset.create static method
   */
  constructor(id: string, name: string, symbol: string, decimal: number) {
    register(this);

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

  fromString(v: string): Amount {
    // ISSUE #32 rename as `amount()`
    return new Amount(this, BigNumber.fromString(v));
  }

  price(fiat: FiatCurrency, rate: BigNumberSource) {
    return new Price(this, fiat, rate);
  }

  toString(): string {
    return `${this.symbol}`;
  }
}
