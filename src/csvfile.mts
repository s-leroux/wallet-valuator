import { readFile } from "node:fs/promises";

import { ValueError, ProtocolError } from "./error.mjs";
import { bsearch, linsearch } from "./bsearch.mjs";

import { logger } from "./debug.mjs";
const log = logger("csvfile");

type CSVParserOption = {
  separator?: string;
};

// =====================================================================
// CSV parser
// =====================================================================

/*
 * RFC-4180-compatible CSV parser implemented as a state machine.
 *
 * The parser handles:
 * - Quoted fields with escaped quotes (doubled)
 * - Fields containing commas, quotes, and line breaks
 * - Empty fields and records
 * - Both LF and CRLF line endings
 */

const enum State {
  Start,
  NewRow,
  NewField,
  InQuotedField,
  TestEndQuote,
  InField,
  CR,
  LF,
  Error,
  EndOfField,
  EndOfRow,
  End,
}

/**
 * Lightweight RFC-4180-compatible CSV parser.
 * - Handles quoted fields
 * - Supports embedded commas, quotes, and newlines
 * - No external dependencies
 */
export function* parseCSV(
  text: string,
  options: CSVParserOption = {}
): IterableIterator<string[]> {
  const separator = options.separator ?? ",";

  let idx = 0;
  let state = State.Start;
  let error: Error;
  let token: string;
  let row: string[];
  let field: string;

  for (;;) {
    switch (state) {
      case State.Start:
        token = text[idx++] ?? "\0";
        state = State.NewRow;
        break;

      case State.NewRow:
        row = [];
        // @ts-expect-error: State machine ensures token is initialized
        if (token === "\0") {
          state = State.End;
        } else {
          state = State.NewField;
        }
        break;

      case State.NewField:
        field = "";
        // @ts-expect-error: State machine ensures token is initialized
        if (token === '"') {
          token = text[idx++] ?? "\0";
          state = State.InQuotedField;
        } else {
          state = State.InField;
        }
        break;

      case State.InQuotedField:
        // @ts-expect-error: State machine ensures token is initialized
        switch (token) {
          case "\0":
            error = new ProtocolError(
              "Unexpected end of file: quoted field not properly terminated"
            );
            state = State.Error;
            break;
          case '"':
            token = text[idx++] ?? "\0";
            state = State.TestEndQuote;
            break;
          default:
            // @ts-expect-error: State machine ensures field and token are initialized
            field += token;
            token = text[idx++] ?? "\0";
        }
        break;

      case State.TestEndQuote:
        // @ts-expect-error: State machine ensures token is initialized
        if (token === '"') {
          // @ts-expect-error: State machine ensures field and token are initialized
          field += token;
          token = text[idx++] ?? "\0";
          state = State.InQuotedField;
        } else {
          state = State.InField;
        }
        break;

      case State.InField:
        // @ts-expect-error: State machine ensures token is initialized
        switch (token) {
          case "\0":
            state = State.EndOfField;
            break;
          case "\r":
            token = text[idx++] ?? "\0";
            state = State.CR;
            break;
          case "\n":
            state = State.LF;
            break;
          case separator:
            state = State.EndOfField;
            break;
          default:
            // @ts-expect-error: State machine ensures field and token are initialized
            field += token;
            token = text[idx++] ?? "\0";
        }
        break;

      case State.CR:
        // @ts-expect-error: State machine ensures token is initialized
        if (token === "\n") {
          state = State.LF;
        } else {
          error = new ProtocolError(
            "Invalid line ending: expected CRLF sequence, found standalone CR"
          );
          state = State.Error;
        }
        break;

      case State.LF:
        state = State.EndOfField;
        break;

      case State.Error:
        // @ts-expect-error: State machine ensures error is initialized
        throw error;

      case State.EndOfField:
        // @ts-expect-error: State machine ensures row and field are initialized
        row.push(field);
        // @ts-expect-error: State machine ensures token is initialized
        switch (token) {
          case "\0":
            state = State.EndOfRow;
            break;
          case "\n":
            token = text[idx++] ?? "\0";
            state = State.EndOfRow;
            break;
          case separator:
            token = text[idx++] ?? "\0";
            state = State.NewField;
            break;
        }
        break;

      case State.EndOfRow:
        // @ts-expect-error: State machine ensures row is initialized
        yield row;
        // @ts-expect-error: State machine ensures token is initialized
        if (token === "\0") {
          state = State.End;
        } else {
          state = State.NewRow;
        }
        break;

      case State.End:
        return;
    }
  }
}

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

//======================================================================
//  DataSource
//======================================================================

/**
 * Interface representing a tabular data source where rows are keyed by a unique value.
 *
 * @typeParam K - The type of the row key (e.g., string, number, or Date).
 * @typeParam V - The type of the values stored in each column.
 */
export interface DataSource<K, V> {
  /**
   * Retrieves the value in a specific column of the row identified by the given key.
   *
   * @param key - The row key to look up.
   * @param field - The column name to retrieve.
   * @returns A tuple `[K, V]` if the row and column are found; otherwise, `undefined`.
   * @throws If the column name is not valid, an error (typically a `ValueError`) should be thrown.
   */
  get(key: K, field: string): [K, V] | undefined;

  /**
   * Retrieves multiple column values from the row identified by the given key.
   *
   * @param key - The row key to look up.
   * @param fields - An array of column names to retrieve.
   * @returns A tuple `[K, ...V[]]` if the row is found; otherwise, `undefined`.
   * @throws If any of the specified column names are invalid, an error (typically a `ValueError`) should be thrown.
   */
  getMany(key: K, fields: string[]): [K, ...V[]] | undefined;

  /**
   * Returns an iterator over all rows in the data source.
   *
   * Each row is represented as a tuple `[K, ...V[]]`, where the first element is the row key
   * and the rest are the column values, in the order defined by the data source's headings.
   */
  [Symbol.iterator](): Iterator<[K, ...V[]]>; // Implements IterableIterator<[K, ...V[]]>
}

export class CSVFileOptionBag {
  reorder?: (input: string[], heading: boolean) => string[]; // FWIW, the reorder helper may resize the row or synthetise new data
  separator?: string;
}

//======================================================================
//  CSV
//======================================================================

/**
 *  Read homogenous simple CSV files.
 *
 *  This class make many asumptions:
 *  - column 0 is the key column sorted in ascending lexicographic order.
 *  - all lines are filled with data of type T // ISSUE #120 Change that!
 */
export class CSVFile<K, T> implements DataSource<K, T> {
  readonly headings: Record<string, number | undefined> = Object.create(null);

  constructor(
    headings: string[],
    readonly rows: [K, ...T[]][],
    readonly sorted: boolean
  ) {
    for (let i = 0; i < headings.length; i++) {
      this.headings[headings[i]] = i;
    }
  }

  getMany(key: K, fields: string[]): [K, ...T[]] | undefined {
    const row = this.sorted
      ? bsearch(this.rows, key)
      : linsearch(this.rows, key);
    if (row === undefined) {
      return undefined;
    }

    const result: [K, ...T[]] = [row[0]];
    for (const i of fields) {
      const idx = this.headings[i];
      if (idx === undefined) {
        throw new ValueError(`Invalid data column ${i}`);
      }
      result.push(row[idx]);
    }
    return result;
  }

  get(key: K, field: string): [K, T] | undefined {
    // below, we know for sure that the result is a tuple of length 2
    return this.getMany(key, [field]) as [K, T] | undefined;
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
    const reorder = options.reorder;

    const sentinel = Symbol();
    let sorted = true;
    let prev: K | typeof sentinel = sentinel;
    let empty = true;
    let headings: string[] | undefined;
    const rows = [] as [K, ...T[]][];

    for (const line of parseCSV(text, options)) {
      if (headings === undefined) {
        // read the heading
        headings = line;
        if (reorder) {
          headings = reorder(headings, true);
        }
      } else {
        // read a data line
        empty = false;
        let row = line;
        if (reorder) {
          row = reorder(row, true);
        }
        const [date, ...rest] = row;
        if (prev !== sentinel) {
          if (sorted && date < (prev)) {
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
