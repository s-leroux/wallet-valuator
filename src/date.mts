import { ValueError } from "./error.mjs";

const intlDateTimeFormats = {
  "en-US": {
    MMM: new Intl.DateTimeFormat("en-US", { month: "short" }),
  },
} as const;

const formatters: Record<string, (date: Date) => string> = {
  // @ts-expect-error __proto__ is intentionally set to null to prevent prototype pollution
  __proto__: null,
  YYYY: (date) => String(date.getUTCFullYear()).padStart(4, "0"),
  MMM: (date) => intlDateTimeFormats["en-US"]["MMM"].format(date),
  MM: (date) => String(date.getUTCMonth() + 1).padStart(2, "0"),
  DD: (date) => String(date.getUTCDate()).padStart(2, "0"),
  D: (date) => String(date.getUTCDate()),
};

/**
 * Formats a date according to the specified format string.
 * Supported format tokens: YYYY (year), MM (month), DD (day)
 */
export function formatDate(format: string, date: Date) {
  return format.replace(/(YYYY|MMM|MM|DD|D)/g, (match) =>
    formatters[match](date)
  );
}

const parsers: Record<string, RegExp> = {
  // @ts-expect-error __proto__ is intentionally set to null to prevent prototype pollution
  __proto__: null,
  YYYYMMDD: /^(?<year>\d\d\d\d)(?<month>\d\d)(?<day>\d\d)$/,
  "YYYY-MM-DD": /^(?<year>\d\d\d\d)-(?<month>\d\d)-(?<day>\d\d)$/,
  "DD-MM-YYYY": /^(?<day>\d\d)-(?<month>\d\d)-(?<year>\d\d\d\d)$/,
};

/**
 * Parses a date string according to the specified format pattern.
 * The pattern must use named capturing groups for year, month and day.
 */
export function parseDate(format: string | RegExp, date: string) {
  const pattern = typeof format === "string" ? parsers[format] : format;
  if (!pattern) {
    throw new ValueError(`${format} is not a valid date format`);
  }

  const match = pattern.exec(date);
  if (!match) {
    throw new ValueError(`${date} does not match ${pattern}`);
  }

  // Let fail as a TypeError if match.groups is `undefined`
  const { year, month, day } = match.groups as {
    year?: string;
    month?: string;
    day?: string;
  };
  if (!year || !month || !day) {
    throw new ValueError(
      `The format must defined capturing groups for day, month and year`
    );
  }

  if (/^\d+$/.test(`${year}${month}${day}`)) {
    const yearNumber = parseInt(year, 10);
    const monthNumber = parseInt(month, 10);
    const dayNumber = parseInt(day, 10);

    const parsedDate = new Date(yearNumber, monthNumber - 1, dayNumber);

    const isValidDate =
      parsedDate.getUTCFullYear() === yearNumber &&
      parsedDate.getUTCMonth() + 1 === monthNumber &&
      parsedDate.getUTCDate() === dayNumber;

    if (!isValidDate) {
      throw new ValueError(
        `${date} is not a valid calendar date`
      );
    }

    return parsedDate;
  }

  throw new ValueError(
    `Cannot create a valid date from ${year} ${month} ${day}`
  );
}
