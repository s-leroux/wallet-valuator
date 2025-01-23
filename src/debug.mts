export class ObjectAlreadyRegisteredError extends Error {
  readonly obj: object;
  readonly id: string;

  constructor(obj: object, id: string) {
    // Synthesize an error message
    const message = `Object ${obj} is already registered with ID "${id}".`;
    super(message);

    this.name = "ObjectAlreadyRegisteredError";
    this.obj = obj;
    this.id = id;

    // Ensure the prototype chain is properly set for extending Error
    Object.setPrototypeOf(this, ObjectAlreadyRegisteredError.prototype);
  }
}

// The global object -> id mapping
const debugIds = new WeakMap<object, string>();
let debugIdCounter = 0;

export function register(obj: object): void {
  let oid = debugIds.get(obj);
  if (oid) {
    throw new ObjectAlreadyRegisteredError(obj, oid);
  }

  oid = `ID-${(debugIdCounter++).toString().padStart(6, "0")}`;
  debugIds.set(obj, oid);
}

/**
 * Retrieves the debug ID of a given object.
 *
 * If the object is not registered in the `debugIds` WeakMap, this function
 * does not raise an error or return a special value like `null` or `undefined`.
 * Instead, it returns a descriptive fallback string to indicate that the object
 * is not registered. This ensures that the function remains non-intrusive and
 * does not interfere with the normal flow of events, as its purpose is purely
 * for debugging.
 */
export function debugId(obj: object): string {
  return (
    debugIds.get(obj) ||
    `Instance of ${obj.constructor.name || "UnknownClass"} not registered`
  );
}
