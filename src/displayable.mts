import { NotImplementedError, ValueError } from "./error.mjs";

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

function alignLeft(width: number) {
  return function (str: string) {
    return str.length > width
      ? str.slice(0, width - 1) + "…"
      : str.padEnd(width);
  };
}

function alignRight(width: number) {
  return function (str: string) {
    return str.length > width
      ? "…" + str.slice(1 - width)
      : str.padStart(width);
  };
}

function alignChar(width: number, dot: string, decimal: number) {
  return function (str: string) {
    const parts = str.split(dot);
    const left = parts[0];
    const right = parts[1] ?? "";

    let field =
      left +
      dot +
      (right.length > decimal
        ? right.slice(0, decimal)
        : right.padEnd(decimal));

    field =
      field.length > width
        ? "…" + field.slice(1 - width)
        : field.padStart(width);

    return field;
  };
}

function id(str: string) {
  return str;
}

export function tabular(sep: string, ...formats: string[]) {
  const formaters = formats.map((format) => {
    if (!format) {
      return id;
    }

    const match = /^([-+]?)(\d+)(.?)(\d*)$/.exec(format);
    if (!match) {
      throw new ValueError(`Invalid format ${format}`);
    }

    const [_, sign, width, dot, decimal] = match;

    if (dot) {
      return alignChar(parseInt(width), dot, parseInt(decimal) || 0);
    }

    if (sign === "-") {
      return alignLeft(parseInt(width));
    }

    return alignRight(parseInt(width));
  });

  return function (...obj: unknown[]) {
    return formaters
      .map((fc, index) => fc(toDisplayString(obj[index])))
      .join(sep);
  };
}
