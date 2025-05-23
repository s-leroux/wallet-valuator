import { ValueError } from "./error.mjs";

const formatters: Record<string, (date: Date) => string> = {
  // @ts-ignore
  __proto__: null,
  YYYY: (date) => String(date.getUTCFullYear()).padStart(4, "0"),
  MM: (date) => String(date.getUTCMonth() + 1).padStart(2, "0"),
  DD: (date) => String(date.getUTCDate()).padStart(2, "0"),
};

export function formatDate(format: string, date: Date) {
  return format.replace(/(YYYY|MM|DD)/g, (match) => formatters[match](date));
}

const parsers: Record<string, RegExp> = {
  // @ts-ignore
  __proto__: null,
  YYYYMMDD: /^(?<year>\d\d\d\d)(?<month>\d\d)(?<day>\d\d)$/,
  "YYYY-MM-DD": /^(?<year>\d\d\d\d)-(?<month>\d\d)-(?<day>\d\d)$/,
  "DD-MM-YYYY": /^(?<day>\d\d)-(?<month>\d\d)-(?<year>\d\d\d\d)$/,
};

export function parseDate(format: string | RegExp, date: string) {
  const pattern = typeof format === "string" ? parsers[format] : format;
  if (!pattern) {
    throw new ValueError(`${format} is not a valid date format`);
  }

  const match = pattern.exec(date);
  if (!match) {
    throw new ValueError(`${date} does not match ${pattern}`);
  }

  // let fail with a TypeError if match.group is undefined
  const { year, month, day } = match.groups!;
  if ((year && month && day) === undefined) {
    throw new ValueError(
      `The format must defined capturing groups for day, month and year`
    );
  }

  if (year && month && day && /^\d+$/.test(`${year}${month}${day}`)) {
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10)
    );
  }

  throw new ValueError(
    `Cannot create a valid date from ${year} ${month} ${day}`
  );
}
