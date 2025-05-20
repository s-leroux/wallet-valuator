import { BigNumber, BigNumberSource } from "./bignumber.mjs";
import { Price } from "./price.mjs";
import { FiatCurrency } from "./fiatcurrency.mjs";
import { InconsistentUnitsError, ValueError } from "./error.mjs";

import { defaultDisplayOptions, DisplayOptions } from "./displayable.mjs";

import { logger } from "./debug.mjs";
import { CryptoRegistry } from "./cryptoregistry.mjs";
const log = logger("crypto-asset");

//======================================================================
//  CryptoAssetID
//======================================================================
export type CryptoAssetID = Lowercase<string> & {
  readonly __brand: unique symbol;
};

export function toCryptoAssetID(id: string): CryptoAssetID {
  if (id !== id.toLowerCase()) {
    throw new ValueError(
      `The id for crypto-assets must be written in all lowercase (was ${id})`
    );
  }
  return id as CryptoAssetID;
}

//======================================================================
//  Run-time type identification
//======================================================================
const IS_CRYPTO_ASSET = Symbol("CryptoAsset");

export function isCryptoAsset(obj: unknown): obj is CryptoAsset {
  return (
    typeof obj === "object" &&
    obj !== null &&
    (obj as { [IS_CRYPTO_ASSET]?: boolean })[IS_CRYPTO_ASSET] === true
  );
}

//======================================================================
//  Amount
//======================================================================

/**
 * Represents a quantity of a CryptoAsset expressed in its display unit.
 *
 * The `Amount` class associates a specific crypto with a quantity,
 * making it easier to handle operations and display amounts in a
 * human-readable format.
 *
 * An `Amount` is used to store a quantity of a given CryptoAsset.
 * `Amount` must not be used to store values (as quantity of money
 * expressed in a given currency).
 *
 * XXX Unify that class with `Value` using generics.
 */
export class Amount {
  crypto: CryptoAsset;
  value: BigNumber;

  /**
   * Creates an instance of `Amount`.
   *
   * @param crypto - The crypto associated with the amount.
   * @param value - The quantity expressed in the display unit.
   * @throws `ValueError` if `value` is negative.
   */
  constructor(crypto: CryptoAsset, value: BigNumber = BigNumber.ZERO) {
    this.crypto = crypto;
    this.value = value;
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

  toDisplayString(options: DisplayOptions): string {
    const valueFormat =
      options["amount.value.format"] ??
      defaultDisplayOptions["amount.value.format"];
    const symbolFormat =
      options["amount.symbol.format"] ??
      defaultDisplayOptions["amount.symbol.format"];
    const sep =
      options["amount.separator"] ?? defaultDisplayOptions["amount.separator"];

    return `${valueFormat(this.value.toString())}${sep}${symbolFormat(
      this.crypto.symbol
    )}`;
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
   * Returns a new `Amount` representing the negation of the current instance.
   *
   * This method creates a new `Amount` with the same crypto but with the value
   * multiplied by -1.
   *
   * @returns A new `Amount` object with the same crypto and negated value.
   */
  negated(): Amount {
    return new Amount(this.crypto, this.value.negated());
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

//======================================================================
//  CryptoAsset
//======================================================================

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
  readonly id: CryptoAssetID; // internal id for that asset cross-chain
  readonly name: string;
  readonly symbol: string;
  readonly decimal: number;

  private [IS_CRYPTO_ASSET] = true;

  /**
   * Creates an instance of `CryptoAsset`.
   *
   * @param id - The unique internal identifier for the crypto-asset.
   * @param name - The human-readable name of the crypto.
   * @param symbol - The symbol used to represent the crypto (e.g., "ETH").
   * @param decimal - The number of decimal places used for the crypto.
   */
  private constructor(
    id: CryptoAssetID,
    name: string,
    symbol: string,
    decimal: number
  ) {
    this.id = id;
    this.name = name;
    this.symbol = symbol;
    this.decimal = decimal;
  }

  /**
   * Creates a new `CryptoAsset` instance with the given parameters.
   * Crypto-assets are guaranteed to be unique in a given registry.
   *
   * Client-code should normally not have to call this method directly,
   * but through the `CryptoRegistry.findCryptoAsset()` method. This is the
   * preferred way to obtain a reference to a logical crypto-asset.
   *
   * @example
   * ```typescript
   * const cryptoRegistry = CryptoRegistry.create();
   * const bitcoin = cryptoRegistry.findCryptoAsset(id, name, symbol, decimal);
   * ```
   *
   * @param registry - Map of crypto-asset IDs to their corresponding CryptoAsset instances
   * @param id - The unique internal identifier for the crypto-asset
   * @param name - The human-readable name of the crypto
   * @param symbol - The symbol used to represent the crypto (e.g., "ETH")
   * @param decimal - The number of decimal places used for the crypto
   * @returns A new `CryptoAsset` instance
   */
  static create(
    registry: CryptoRegistry,
    id: string | CryptoAssetID,
    name: string,
    symbol: string,
    decimal: number
  ) {
    const normalizedId = toCryptoAssetID(id);
    const existing = registry.getCryptoAsset(normalizedId);
    if (existing) {
      // consistency checks
      if (name !== existing.name || symbol !== existing.symbol) {
        log.warn(
          "C2003",
          `existing ${name} ${symbol} different from ${existing.name} ${existing.symbol}`
        );
      }
      if (decimal !== existing.decimal) {
        log.error(
          "C3003",
          `existing precision ${decimal} different from ${existing.decimal} for ${name}`
        );
        throw new InconsistentUnitsError(decimal, existing.decimal);
      }

      return existing;
    }

    const newCryptoAsset = new CryptoAsset(normalizedId, name, symbol, decimal);
    registry.registerCryptoAsset(newCryptoAsset);
    return newCryptoAsset;
  }

  /**
   * Converts a value expressed in the base unit to an `Amount` in the display unit.
   *
   * @param baseunit - A string representing the value in the crypto's base unit.
   * @returns An `Amount` object representing the value in the display unit.
   * @example
   * const eth = CryptoAsset.create('Ethereum', '0x...', 'Ether', 'ETH', 18);
   * const amount = eth.fromBaseUnit('1000000000000000000'); // 1 ETH
   * console.log(amount.toString()); // "1 ETH"
   */
  amountFromBaseUnit(baseunit: string): Amount {
    return new Amount(this, BigNumber.fromDigits(baseunit, this.decimal));
  }

  amountFromString(v: string): Amount {
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
