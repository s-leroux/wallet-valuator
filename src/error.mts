export class NotImplementedError extends Error {
  constructor(message: string = "Not implemented yet.") {
    super(message);
    this.name = "NotImplementedError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}

export class IncompatibleUnitsError extends Error {
  constructor(unitA: any, unitB: any) {
    super(`Imcompatible units ${unitA.toString()} and ${unitB.toString()}`);
    this.name = "IncompatibleUnitsError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}
