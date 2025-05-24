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

export interface DataSource<R, V> {
  get(row: R, col: string): [R, V] | undefined;
}

/**
 * Read and parse COO file.
 *
 * This file format is not standard, but it resembles a coordinate list (COO)
 * representation commonly used in sparse matrix libraries.
 *
 * In this format data point are represented as (row, column, value) triples,
 * one per line.
 */
export class COOFile<T> implements DataSource<string, T> {
  constructor(private columns: Map<string, Column<T>>) {}

  get(row: string, col: string): Row<T> | undefined {
    const column = this.columns.get(col);
    if (!column) {
      return undefined;
    }

    return bsearch(column, row);
  }

  static createFromPath<T>(
    path: string,
    fn: (arg0: string) => T
  ): Promise<COOFile<T>> {
    return readFile(path, { encoding: "utf8" }).then((text) =>
      COOFile.createFromText(text, fn)
    );
  }

  static createFromText<T>(text: string, fn: (arg0: string) => T): COOFile<T> {
    const columns = new Map<string, Column<T>>();
    const separator = ",";

    let empty = true;
    for (const line of lineIterator(text)) {
      empty = false;
      let [date, ...rest] = Array.from(itemIterator(line, separator));

      if ((rest.length & 1) === 1) {
        throw new ValueError(
          "Invalid record format. Should be (DATE, [KEY, VALUE]...)"
        );
      }

      while (rest.length) {
        const [key, value, ...tail] = rest;
        let column = columns.get(key);
        if (!column) {
          column = [];
          columns.set(key, column);
        } else {
          // check consistency
          const prev = column.at(-1)![0];
          if (date < prev) {
            throw new ValueError("Data must be stored in ascending order");
          }
        }

        column.push([date, fn(value)]);

        rest = tail;
      }
    }

    if (empty) {
      throw new ValueError("Data cannot be empty");
    }
    return new COOFile(columns);
  }
}

class CSVFileOptionBag {
  reorder?: (input: string[], heading: boolean) => string[]; // FWIW, the reorder helper may resize the row or synthetise new data
  separator?: string;
}

/**
 *  Read homogenous simple CSV files.
 *
 *  This class make many asumptions:
 *  - column 0 is the key column sorted in ascending lexicographic order.
 *  - all lines are filled with data of type T // XXX Change that!
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
