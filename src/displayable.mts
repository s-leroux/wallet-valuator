import { formatDate as dateUtilsFormatDate } from "./date.mjs";
import { logger } from "./debug.mjs";
import { NotImplementedError, ValueError } from "./error.mjs";

const log = logger("displayable");

export interface Displayable {
  toDisplayString(options: Readonly<DisplayOptions>): string;
}

export type DisplayOptions = Partial<{
  "address.compact": boolean; // Display numeric address in compact form
  "address.name": boolean; // Display address name instead of numeric address
  "amount.separator": string;
  "amount.symbol.format": (arg: string) => string;
  "amount.value.format": (arg: string) => string;
  "date.format": string; // Defines a date format as understood by formatDate
  "record.format": (...obj: unknown[]) => string;
  "shift.width": number; // Defines the indentation width (in number of character)
}>;

function id<T>(x: T) {
  return x;
}

export const defaultDisplayOptions: Required<DisplayOptions> = {
  "shift.width": 2,
  "date.format": "YYYY-MM-DD",
  "address.compact": false,
  "address.name": false,
  "amount.separator": " ",
  "amount.symbol.format": id,
  "amount.value.format": id,
  "record.format": (...obj: unknown[]) => {
    throw new NotImplementedError();
  },
};

function noDisplayString(obj: object & {}, options: DisplayOptions): string {
  if (Array.isArray(obj)) {
    const body = (obj)
      .map((item) => toDisplayString(item, options))
      .join("\n");
    if (body) {
      return `[\n${TextUtils.indent(body, 1, options)}\n]`;
    }
    return "[]";
  }

  // Other standard container?
  const values = (obj as any).values?.();
  const classname = obj.constructor?.name ?? "[null prototype]";

  if (values) {
    return `${classname}(${noDisplayString(Array.from(values), options)})`;
  }

  log.trace("C1015", `Unable to format as display string ${classname} ${obj}`);
  log.debug(classname, obj);
  throw new NotImplementedError(
    `Missing toDisplayString() in ${classname} ${obj}`
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

export function format(format: string) {
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
}

export function tabular(sep: string, ...formats: string[]) {
  const formaters = formats.map(format);

  return function (...obj: unknown[]) {
    return formaters
      .map((fc, index) => fc(toDisplayString(obj[index])))
      .join(sep);
  };
}

//========================================================================
//  Common text formatting utilities
//========================================================================

export const TextUtils = {
  //========================================================================
  //  Date formatting
  //========================================================================
  formatDate(date: Date | number, options = {} as DisplayOptions) {
    const format =
      options["date.format"] ?? defaultDisplayOptions["date.format"];
    if (typeof date !== "object") {
      date = new Date(date);
    }

    return dateUtilsFormatDate(format, date);
  },

  //========================================================================
  //  Indentation
  //========================================================================
  indent(
    text: string[] | string, // FIXME Accept only strings
    n: number = 1,
    options = {} as DisplayOptions
  ) {
    let isString = false;
    if (typeof text === "string") {
      text = text.split("\n");
      isString = true;
    }
    const shiftWidth =
      options["shift.width"] ?? defaultDisplayOptions["shift.width"];

    if (!Number.isInteger(n) || n <= 0) {
      throw new ValueError(
        `indent(): "n" must be a positive integer. Received: ${n}`
      );
    }

    const pad = "".padEnd(n * shiftWidth);
    const res = text.map((str) => pad + str);
    if (isString) {
      return res.join("\n");
    } else {
      return res;
    }
  },
} as const;
