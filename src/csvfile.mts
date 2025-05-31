import { readFile } from "node:fs/promises";

import { NotImplementedError, ValueError } from "./error.mjs";
import { bsearch, linsearch } from "./bsearch.mjs";

import { logger } from "./debug.mjs";
const log = logger("csvfile");

type Row<T> = [string, T];
type Column<T> = Row<T>[];

export function* lineIterator(input: string): IterableIterator<string> {
  const lineRegex = /([^\r\n]+)(?:[\r\n]+|$)/g;

  let match;
  while ((match = lineRegex.exec(input)) !== null) {
    yield match[1];
  }
}

export function itemIterator(
  input: string,
  separator: string
): IterableIterator<string> {
  let start = 0;
  const inputLength = input.length;
  const separatorLength = separator.length;

  function* _itemIterator(): IterableIterator<string> {
    while (start < inputLength) {
      const index = input.indexOf(separator, start);
      if (index < 0) {
        yield input.substring(start).trim();
        return;
      }

      yield input.substring(start, index).trim();
      start = index + separatorLength;
    }

    yield ""; // If we are here, we have a trailing separator
  }

  return _itemIterator();
}

export interface DataSource<K, V> {
  get(row: K, col: string): [K, V] | undefined;

  [Symbol.iterator](): Iterator<[K, ...V[]]>; // implements IterableIterator<[K, ...V[]]>
}

export class CSVFileOptionBag {
  reorder?: (input: string[], heading: boolean) => string[]; // FWIW, the reorder helper may resize the row or synthetise new data
  separator?: string;
}

/**
 *  Read homogenous simple CSV files.
 *
 *  This class make many asumptions:
 *  - column 0 is the key column sorted in ascending lexicographic order.
 *  - all lines are filled with data of type T // ISSUE #120 Change that!
 */
export class CSVFile<K, T> implements DataSource<K, T> {
  constructor(
    readonly headings: string[],
    readonly rows: [K, ...T[]][],
    readonly sorted: boolean
  ) {}

  get(row: K, col: string): [K, T] | undefined {
    const idx = this.headings.indexOf(col);
    if (idx < 1) {
      throw new ValueError(`Invalid data column ${col}`);
    }

    const result = this.sorted
      ? bsearch(this.rows, row)
      : linsearch(this.rows, row);
    if (result === undefined) {
      return undefined;
    }

    return [result[0], result[idx] as T];
  }

  [Symbol.iterator](): Iterator<[K, ...T[]]> {
    return this.rows[Symbol.iterator]();
  }

  static createFromPath<K, T>(
    path: string,
    toKey: (arg0: string) => K,
    toData: (arg0: string) => T,
    options: CSVFileOptionBag = {}
  ): Promise<CSVFile<K, T>> {
    return readFile(path, { encoding: "utf8" }).then((text) =>
      CSVFile.createFromText(text, toKey, toData, options)
    );
  }

  static createFromText<K, T>(
    text: string,
    toKey: (arg0: string) => K,
    toData: (arg0: string) => T,
    options: CSVFileOptionBag = {}
  ): CSVFile<K, T> {
    let lineNum = 0;
    const separator = options.separator ?? ",";
    const reorder = options.reorder;

    const sentinel = Symbol();
    let sorted = true;
    let prev: K | typeof sentinel = sentinel;
    let empty = true;
    let headings: string[] | undefined;
    const rows = [] as [K, ...T[]][];

    for (const line of lineIterator(text)) {
      lineNum += 1;
      if (headings === undefined) {
        // read the heading
        headings = Array.from(itemIterator(line, separator));
        if (reorder) {
          headings = reorder(headings, true);
        }
      } else {
        // read a data line
        empty = false;
        let row = Array.from(itemIterator(line, separator));
        if (reorder) {
          row = reorder(row, true);
        }
        const [date, ...rest] = row;
        if (prev !== sentinel) {
          if (sorted && date < (prev as K)) {
            sorted = false;
            log.trace("C1005", "The data are not sorted by column 0");
          }
        }
        rows.push([(prev = toKey(date)), ...rest.map(toData)]);
      }
    }
    if (empty || !headings) {
      throw new ValueError("No data to proceed");
    }
    return new CSVFile(headings, rows, sorted);
  }
}
