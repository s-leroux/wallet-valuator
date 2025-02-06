import { NotImplementedError } from "./error.mjs";

export interface Displayable {
  toDisplayString(options: Readonly<DisplayOptions>): string;
}

export type DisplayOptions = Partial<{
  "address.compact": boolean;
}>;

function noDisplayString(obj: object & {}, options: DisplayOptions): string {
  throw new NotImplementedError(
    `Missing toDisplayString() in ${obj.constructor.name}`
  );
}

export function toDisplayString(
  obj: unknown,
  options: DisplayOptions = {}
): string {
  const type = typeof obj;

  if (!obj || type !== "object") {
    // ^ above: handle null gracefully

    // for non-object, use the default toString() implementation
    return String(obj);
  }

  // Here, obj is necessarily a (defined and) non-null object
  return (
    (obj as Displayable).toDisplayString?.(options) ??
    noDisplayString(obj, options)
  );
}
