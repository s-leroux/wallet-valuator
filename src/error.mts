import type { CryptoAsset } from "./cryptoasset.mjs";
import { FiatCurrency } from "./fiatcurrency.mjs";

export type Tag = {
  errCode?: string;
};

export class NotImplementedError extends Error {
  constructor(message: string = "Not implemented yet.") {
    super(message);
    this.name = "NotImplementedError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}

export class InternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}

export class InconsistentUnitsError extends Error {
  constructor(unitA: unknown, unitB: unknown) {
    super(`Imcompatible units ${unitA} and ${unitB}`);
    this.name = "InconsistentUnitsError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}

/**
 * A value does not satisfy a pre-condition.
 */
export class ValueError extends Error {
  constructor(message: string = "") {
    super(`Value error: ${message}`);
    this.name = "ValueError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}

/**
 * A value was already present
 */
export class DuplicateKeyError extends Error {
  constructor(key: unknown = "") {
    super(String(key));
    this.name = "DuplicateKeyError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}

export class InvalidTreeStructureError extends Error {
  constructor(keyPath: string[] = []) {
    const message = keyPath.length
      ? `Graphic structure detected at key path: ${keyPath.join(" -> ")}`
      : "Graphic structure detected";
    super(message);

    // Set the name explicitly for better debugging
    this.name = "InvalidTreeStructureError";

    // Maintain proper prototype chain for Error subclassing
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a method is called in an invalid sequence or when a protocol is violated.
 * This error indicates that the caller has not followed the required sequence of operations
 * or has violated the expected protocol for using an API or component.
 *
 * Examples:
 * - Calling a method before initialization is complete
 * - Using an API in an order that violates its contract
 * - Calling a method that requires a previous method to be called first
 *
 * @see AssertionError - For errors related to failed assertions or pre-conditions
 */
export class ProtocolError extends Error {
  constructor(message: string = "Protocol violation.") {
    super(message);
    this.name = "ProtocolError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}

/**
 * Thrown when a pre-condition or invariant is violated.
 * This error indicates that a fundamental assumption about the state or input
 * of the system has been broken.
 *
 * Examples:
 * - A required property is missing or invalid
 * - A value is outside its expected range
 * - A type constraint is violated
 * - A factory returns an object that doesn't match its contract
 */
export class AssertionError extends Error {
  constructor(message: string = "Assertion error.") {
    super(message);
    this.name = "AssertionError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}

export class MissingPriceError extends Error {
  constructor(asset: CryptoAsset, fiat: FiatCurrency, date: Date) {
    super(`No price found for ${asset}/${fiat} at ${date.toISOString()}`);
    this.name = "MissingPriceError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}
