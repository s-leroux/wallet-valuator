export class NotImplementedError extends Error {
  constructor(message: string = "Not implemented yet.") {
    super(message);
    this.name = "NotImplementedError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}

export class InconsistentUnitsError extends Error {
  constructor(unitA: any, unitB: any) {
    super(`Imcompatible units ${unitA.toString()} and ${unitB.toString()}`);
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
 * Thrown when a method is called in an invalid sequence or protocol is violated.
 */
export class ProtocolError extends Error {
  constructor(message: string = "Protocol violation.") {
    super(message);
    this.name = "ProtocolError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}
