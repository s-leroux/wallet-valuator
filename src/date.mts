const formatters: Record<string, (date: Date) => string> = {
  YYYY: (date) => String(date.getUTCFullYear()).padStart(4, "0"),
  MM: (date) => String(date.getUTCMonth() + 1).padStart(2, "0"),
  DD: (date) => String(date.getUTCDate()).padStart(2, "0"),
};

export function formatDate(format: string, date: Date) {
  return format.replace(/(YYYY|MM|DD)/g, (match) => formatters[match](date));
}
