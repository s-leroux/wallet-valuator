import { readFile } from "node:fs/promises";

import { ValueError, ProtocolError } from "./error.mjs";
import { bsearch, linsearch } from "./bsearch.mjs";

import { logger } from "./debug.mjs";
const log = logger("csvfile");

type Row<T> = [string, T];
type Column<T> = Row<T>[];

type CSVParserOption = {
  separator?: string;
};

// =====================================================================
// CSV parser
// =====================================================================

/*
 * Lightweight RFC-4180-compatible CSV parser.
 * - Handles quoted fields
 * - Supports embedded commas, quotes, and newlines
 * - No external dependencies
 *
 * The parser is implemented as the state machine described ins `csv.dot`
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
    const reorder = options.reorder;

    const sentinel = Symbol();
    let sorted = true;
    let prev: K | typeof sentinel = sentinel;
    let empty = true;
    let headings: string[] | undefined;
    const rows = [] as [K, ...T[]][];

    for (const line of parseCSV(text, options)) {
      lineNum += 1;
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
