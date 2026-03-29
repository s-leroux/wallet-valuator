import {
  Fixed,
  IntegerSource,
  fixedFromSource,
  FixedSource,
} from "./bignumber.mjs";
import { Price } from "./price.mjs";
import { FiatCurrency } from "./fiatcurrency.mjs";
import { InconsistentUnitsError, ValueError } from "./error.mjs";

import { defaultDisplayOptions, DisplayOptions } from "./displayable.mjs";

import { logger } from "./debug.mjs";
import { Value } from "./valuation.mjs";
import { Quantity } from "./quantity.mjs";
import { InstanceCache } from "./instancecache.mjs";
const log = logger("crypto-asset");

type AmountSource = FixedSource;

//======================================================================
//  CryptoAssetID
//======================================================================
export type CryptoAssetInternalID = Lowercase<string> & {
  readonly __brand: unique symbol;
};

export function toCryptoAssetInternalID(id: string): CryptoAssetInternalID {
  if (id !== id.toLowerCase()) {
    throw new ValueError(
      `The id for crypto-assets must be written in all lowercase (was ${id})`,
    );
  }
  return id as CryptoAssetInternalID;
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
 */
export class Amount implements Quantity<CryptoAsset, Amount> {
  crypto: CryptoAsset;
  value: Fixed;

  /**
   * Creates an instance of `Amount`.
   *
   * @param crypto - The crypto associated with the amount.
   * @param value - The quantity expressed in the display unit.
   */
  constructor(crypto: CryptoAsset, value: AmountSource = Fixed.ZERO) {
    this.crypto = crypto;
    this.value = fixedFromSource(value);
  }

  /**
   * Returns a string representation of the amount.
   *
   * @returns A string combining the value and the crypto symbol.
   * @example
   * const amount = new Amount({ symbol: 'ETH', ... }, Fixed.fromString("1"));
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
      this.crypto.symbol,
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

  isZero(): boolean {
    return this.value.isZero();
  }

  valueAt(price: Price, scale?: bigint) {
    if (this.crypto !== price.crypto) {
      throw new InconsistentUnitsError(this.crypto, price.crypto);
    }
    // `Price.rate` is `Fixed`; multiply the amount by the rate to obtain fiat `Value`.
    return new Value(price.fiatCurrency, this.value.mul(price.rate, scale));
  }

  /**
   * Returns a new Amount representing this value scaled by a factor.
   *
   * This operation preserves the Amount's unit.
   * The returned Amount is expressed at the scale of the receiver.
   *
   * @param factor - The scalar multiplier as a FixedLike.
   * @returns A new Amount with the same crypto and scale.
   */
  scaledBy(factor: FixedSource): Amount {
    const factorFixed = fixedFromSource(factor);
    return new Amount(
      this.crypto,
      this.value.mul(factorFixed, this.value.scale),
    );
  }

  /**
   * Returns the scalar ratio between this Amount and a base Amount.
   *
   * In other words, it answers: "By which factor must the base Amount be multiplied
   * to yield this Amount?"
   *
   * The result is expressed as a dimensionless quantity whose scale is
   * implementation-dependent but large enough to ensure it is invertible using {@link scaledBy}.
   *
   * @param other - The reference Amount to compare against.
   * @returns The scalar ratio (this / other).
   */
  relativeTo(other: Amount): Fixed {
    if (this.crypto !== other.crypto) {
      throw new InconsistentUnitsError(this, other);
    }
    return this.value.div(other.value, this.value.scale + other.value.scale); // XXX Is it really the right scale?
  }
}

//======================================================================
//  CryptoAsset
//======================================================================

export type CryptoAssetCache = InstanceCache<
  CryptoAssetInternalID,
  CryptoAsset
>;
export function CryptoAssetCache(): CryptoAssetCache {
  return new InstanceCache();
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
  readonly id: CryptoAssetInternalID; // internal id for that asset cross-chain
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
    id: CryptoAssetInternalID,
    name: string,
    symbol: string,
    decimal: number,
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
   */
  static create(
    cache: CryptoAssetCache,
    id: string | CryptoAssetInternalID,
    name: string,
    symbol: string,
    decimal: number,
  ): CryptoAsset {
    const normalizedId = toCryptoAssetInternalID(id);

    return cache.getOrCreate(
      normalizedId,
      () => {
        return new CryptoAsset(normalizedId, name, symbol, decimal);
      },
      (existing) => {
        // consistency checks
        if (name !== existing.name || symbol !== existing.symbol) {
          log.warn(
            "C2003",
            `existing ${name} ${symbol} different from ${existing.name} ${existing.symbol}`,
          );
        }
        if (decimal !== existing.decimal) {
          log.error(
            "C3003",
            `existing precision ${decimal} different from ${existing.decimal} for ${name}`,
          );
          throw new InconsistentUnitsError(decimal, existing.decimal);
        }
      },
    );
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
  amountFromBaseUnit(baseunit: IntegerSource): Amount {
    return new Amount(this, Fixed.create(baseunit, BigInt(this.decimal)));
  }

  amountFromString(v: string): Amount {
    // ISSUE #32 rename as `amount()`
    return new Amount(this, Fixed.fromString(v));
  }

  price(fiat: FiatCurrency, rate: FixedSource) {
    return new Price(this, fiat, rate);
  }

  priceFromNumber(fiat: FiatCurrency, rate: number, scale: IntegerSource) {
    return new Price(this, fiat, Fixed.fromNumber(rate, scale));
  }

  toString(): string {
    return `${this.symbol}`;
  }
}
