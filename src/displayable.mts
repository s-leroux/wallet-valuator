import { Fixed, fixedFromSource, type FixedSource } from "./bignumber.mjs";
import { formatDate as dateUtilsFormatDate } from "./date.mjs";
import { logger } from "./debug.mjs";
import { NotImplementedError, ValueError } from "./error.mjs";

const log = logger("displayable");

export interface Displayable {
  toDisplayString(options: Readonly<DisplayOptions>): string;
}

export type DateFormat = string | ((date: Date) => string);

export type DisplayOptions = Partial<{
  "address.compact": boolean; // Display numeric address in compact form
  "address.name": boolean; // Display address name instead of numeric address
  "amount.separator": string;
  "amount.symbol.format": (arg: string) => string; // DEPRECATED: use "amount.format" instead
  "amount.value.format": (arg: string) => string; // DEPRECATED: use "amount.format" instead
  "amount.format": Formatter; // Defines an amount format as understood by formatAmount
  "date.format": DateFormat; // Defines a date format as understood by formatDate
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
  "amount.format": String,
  "record.format": (...obj: unknown[]) => {
    throw new NotImplementedError();
  },
};

/**
 * Format an object for display.
 *
 * This function is called by {@link toDisplayString} to format objects that are not instances of {@link Displayable}.
 *
 * @param obj - The object to format as a display string.
 * @param options - The display options to use for formatting.
 * @returns The display string for the object.
 */
function noDisplayString(
  obj: object & {
    values?: () => Iterable<unknown>;
    toString?: () => string;
  },
  options: DisplayOptions,
): string {
  if (Array.isArray(obj)) {
    const body = obj.map((item) => toDisplayString(item, options)).join("\n");
    if (body) {
      return `[\n${TextUtils.indent(body, 1, options)}\n]`;
    }
    return "[]";
  }

  // Date format
  if (obj instanceof Date) {
    return TextUtils.formatDate(obj, options);
  }

  // Fixed format
  if (obj instanceof Fixed) {
    return obj.toFixed();
  }

  // Other standard container?
  const values = (obj as { values?: () => Iterable<unknown> }).values?.();
  const classname = obj.constructor?.name ?? "[null prototype]";

  if (values) {
    return `${classname}(${noDisplayString(Array.from(values), options)})`;
  }

  log.trace("C1015", `Unable to format as display string ${classname} ${obj}`);
  log.debug(classname, obj);
  throw new NotImplementedError(
    `Missing toDisplayString() in ${classname} ${obj}`,
  );
}

export function toDisplayString(
  obj: unknown,
  options: DisplayOptions = {},
): string {
  const type = typeof obj;

  if (!obj || type !== "object") {
    // ^ above: handle null gracefully: typeof null === "object", but null is falsy.

    // for non-object, use the default toString() implementation
    // XXX Shouldn't we allow number formatting specifiers?
    return String(obj);
  }

  // At this point, obj is necessarily a (defined and) non-null object
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

type OverflowMode = "error" | "expand" | "truncate";

interface OverflowContext {
  raw: string;
  width: number;
  spec: string;
}

type OverflowPolicy = OverflowMode | ((ctx: OverflowContext) => string);
interface FormatOptions {
  overflow?: OverflowPolicy;
}

type Formatter = (arg: Record<string, unknown>) => string;

/**
 * `objectFormatter` mini-language: strings use {@link formatStringAtom}. All other
 * formatted numeric fields use {@link Fixed} — {@link Fixed} values keep their
 * stored scale when the format omits a precision; `number` and legacy
 * {@link BigNumberSource} values are converted with {@link fixedFromSource} and
 * default to six fraction digits when the format omits a precision (matching the
 * old Decimal.js `toFixed(6)` behavior). The dedicated BigNumber `toFixed` branch
 * is intentionally removed so rendering stays aligned with fixed-point value types.
 */
type AtomFormatter<T> = (
  value: T,
  width: number,
  precision: number | undefined,
  zero: boolean,
) => string;

function formatStringAtom(
  value: string,
  width: number,
  precision: number | undefined,
  zero: boolean,
): string {
  let valueAsString = value;
  if (precision !== undefined) {
    valueAsString = valueAsString.slice(0, precision);
  }
  if (width) {
    valueAsString = valueAsString.padEnd(width, " ");
  }

  return valueAsString;
}

function formatNumberAtom(
  value: number,
  width: number,
  precision: number | undefined,
  zero: boolean,
): string {
  return formatFixedAtom(
    Fixed.fromNumber(value, precision ?? 6),
    width,
    precision,
    zero,
  );
}

function formatFixedAtom(
  value: Fixed,
  width: number,
  precision: number | undefined,
  zero: boolean,
): string {
  let valueAsString = value.toFixed(precision);
  if (width) {
    valueAsString = valueAsString.padStart(width, zero ? "0" : " ");
  }

  return valueAsString;
}

export const FORMAT_RE =
  /{(?<field>\w+)(?<format>:(?<zero>0+)?(?<width>[1-9]\d*)(?:\.(?<precision>\d+))?)?}/g;

export type FormatGroups =
  | {
      field: string;
      format: undefined;
      zero: undefined;
      width: undefined;
      precision: undefined;
    }
  | {
      field: string;
      format: string;
      zero?: string;
      width: string;
      precision?: string;
    };

export function objectFormatter(
  format: string,
  options: FormatOptions = {},
): Formatter {
  return (arg: Record<string, string | FixedSource>): string => {
    return format.replace(FORMAT_RE, (_, ...args): string => {
      const groups = args.at(-1)! as FormatGroups;
      const field = groups.field;
      let value = arg[field];
      if (!value) {
        throw new ValueError(
          `Invalid format ${format}. Field ${field} not found.`,
        );
      }

      if (!groups.format) {
        return toDisplayString(value);
      }

      let atomFormatter: AtomFormatter<unknown>;
      if (typeof value === "string") {
        atomFormatter = formatStringAtom;
      } else if (value instanceof Fixed) {
        atomFormatter = formatFixedAtom;
      } else if (typeof value === "number") {
        atomFormatter = formatNumberAtom;
      } else {
        atomFormatter = formatFixedAtom;
        value = fixedFromSource(value);
      }

      let result = atomFormatter(
        value,
        +groups.width,
        groups.precision ? +groups.precision : undefined,
        groups.zero !== undefined,
      );

      // Constrain the total field width
      const width = +groups.width;
      if (width) {
        result =
          result.length > width
            ? "…" + result.slice(1 - width)
            : result.padStart(width);
      }

      return result;
    });
  };
}

/**
 * @param format - A string representing the format to apply to the input.
 * @returns A function that formats the input according to the format.
 *
 * See {@link cryptoasset.amountFormatter} and {@link cryptoasset.formatAmount}
 * for the mini-language specifications for number formatting and field alignment.
 */
export function format(format: string) {
  if (!format) {
    return id;
  }

  // XXX Add tests to ensure the format max width is honored
  // XXX The semantic of the[+-] modifier is ambiguous. It is used to indicate the sign of the number, but it is also used to indicate the alignment of the number.
  const match = /^([-+]?)(\d+)(.?)(\d*)$/.exec(format);
  if (!match) {
    throw new ValueError(`Invalid format ${format}`);
  }

  const [, sign, width, dot, decimal] = match;

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
  //----------------------------------------------------------------------
  //  Date formatting
  //----------------------------------------------------------------------
  formatDate(date: Date | number, options = {} as DisplayOptions) {
    // XXX formatDate is a low-level function that should take DateFormat as argument, not DisplayOptions
    const format =
      options["date.format"] ?? defaultDisplayOptions["date.format"];
    if (typeof date !== "object") {
      date = new Date(date);
    }

    return typeof format === "function"
      ? format(date)
      : dateUtilsFormatDate(format, date);
  },

  //----------------------------------------------------------------------
  //  Indentation
  //----------------------------------------------------------------------
  indent(
    text: string[] | string, // FIXME Accept only strings
    n: number = 1,
    options = {} as DisplayOptions,
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
        `indent(): "n" must be a positive integer. Received: ${n}`,
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
