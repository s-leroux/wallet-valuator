import { readFile } from "node:fs/promises";

import { ValueError, ProtocolError } from "./error.mjs";
import { bsearch, linsearch } from "./bsearch.mjs";

import { logger } from "./debug.mjs";
import { Ensure } from "./type.mjs";
const log = logger("datasource");

type CSVParserOption = {
  "field-separator"?: string;
  "garbage-lines"?: number; // Number of lines of garbage to drop from the beginning of the file.
};

// =====================================================================
// CSV parser helpers
// =====================================================================

const enum GarbageState {
  Start,
  Error,
  End,
  InGarbage,
  DecrementGarbageLines,
}

/**
 * Drop *exactly* `n` lines of garbage from the beginning of a text.
 *
 * One line is any sequence of characters ending with LF (and,
 * by extension, CRLF).
 *
 * @param n - The number of lines to drop.
 * @param text - The text to drop the garbage from.
 * @param idx - The index to start dropping the garbage from.
 * @returns The index of the first non-garbage character.
 */
function dropGarbage(n: number, text: string, idx: number = 0): number {
  Ensure.isNonNegativeInteger(n);

  let state = GarbageState.Start;
  let error: Error;

  stateMachine: for (;;) {
    switch (state) {
      case GarbageState.Start:
        if (n > 0) {
          state = GarbageState.InGarbage;
        } else {
          state = GarbageState.End;
        }
        continue stateMachine;

      case GarbageState.End:
        return idx;

      case GarbageState.Error:
        // @ts-expect-error: State machine ensures error is initialized
        throw error;

      case GarbageState.InGarbage:
        switch (text[idx] ?? "\0") {
          case "\n":
            ++idx;
            state = GarbageState.DecrementGarbageLines;
            continue stateMachine;
          case "\0":
            state = GarbageState.Error;
            error = new ProtocolError(
              `Unexpected end of file: still expecting ${n} garbage lines`,
            );
            continue stateMachine;
          default:
            ++idx;
            continue stateMachine;
        }

      case GarbageState.DecrementGarbageLines:
        if (--n > 0) {
          state = GarbageState.InGarbage;
        } else {
          state = GarbageState.End;
        }
        continue stateMachine;
    }
  }
}

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
  options: CSVParserOption = {},
): IterableIterator<string[]> {
  const fieldSeparator = options["field-separator"] ?? ",";
  const garbageLines = options["garbage-lines"] ?? 0;

  let idx = garbageLines > 0 ? dropGarbage(garbageLines, text, 0) : 0;
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
              "Unexpected end of file: quoted field not properly terminated",
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
          case fieldSeparator:
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
            "Invalid line ending: expected CRLF sequence, found standalone CR",
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
          case fieldSeparator:
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

//======================================================================
//  Empty DataSource
//======================================================================

export class EmptyDataSource<K, V> implements DataSource<K, V> {
  get(key: K, field: string): [K, V] | undefined {
    return undefined;
  }

  getMany(key: K, fields: string[]): [K, ...V[]] | undefined {
    return undefined;
  }

  [Symbol.iterator](): Iterator<[K, ...V[]]> {
    return {
      next: () => ({ done: true, value: undefined }),
    };
  }

  static create<K, V>(): DataSource<K, V> {
    return new EmptyDataSource<K, V>();
  }
}

//======================================================================
//  CSV DataSource
//======================================================================

export type CSVFileOptionBag = CSVParserOption & {
  reorder?: (input: string[], heading: boolean) => string[]; // FWIW, the reorder helper may resize the row or synthetise new data
  headings?: string[]; // User-supplied headings, if not provided, the parser will use the first line of the file as headings
  /**
   * When `false` (default), rows where `toKey` or `toData` returns `undefined` trigger {@link ValueError}.
   * When `true`, such rows are skipped with no warning.
   */
  "skip-invalid-rows"?: boolean;
};

/**
 *  Read homogenous simple CSV files.
 *
 *  This class make many asumptions:
 *  - column 0 is the key column sorted in ascending lexicographic order.
 *  - all lines are filled with data of type T // ISSUE #120 Change that!
 */
export class CSVFile<K, T> implements DataSource<K, T> {
  readonly headings = Object.create(null) as Record<string, number | undefined>;

  constructor(
    headings: string[],
    readonly rows: [K, ...T[]][],
    readonly sorted: boolean,
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
    toKey: (arg0: string) => K | undefined,
    toData: (arg0: string) => T | undefined,
    options: CSVFileOptionBag = {},
  ): Promise<CSVFile<K, T>> {
    return readFile(path, { encoding: "utf8" }).then((text) =>
      CSVFile.createFromText(text, toKey, toData, options),
    );
  }

  static createFromText<K, T>(
    text: string,
    toKey: (arg0: string) => K | undefined,
    toData: (arg0: string) => T | undefined,
    options: CSVFileOptionBag = {},
  ): CSVFile<K, T> {
    const reorder = options.reorder;
    const skipInvalidRows = options["skip-invalid-rows"] ?? false;

    const sentinel = Symbol();
    let sorted = true;
    let prev: K | typeof sentinel = sentinel;
    let empty = true;
    let headings = options.headings;
    const rows = [] as [K, ...T[]][];
    let dataRowIndex = 0;

    csvLines: for (const line of parseCSV(text, options)) {
      if (headings === undefined) {
        // read the heading
        headings = line;
        if (reorder) {
          headings = reorder(headings, true);
        }
      } else {
        // read a data line
        dataRowIndex += 1;
        let row = line;
        if (reorder) {
          row = reorder(row, false);
        }
        const [keyRaw, ...restRaw] = row;
        const key = toKey(keyRaw);
        if (key === undefined) {
          if (!skipInvalidRows) {
            throw new ValueError(
              `Invalid CSV data row ${dataRowIndex}: key conversion returned undefined`,
            );
          }
          continue;
        }
        const rest: T[] = [];
        for (const cell of restRaw) {
          let value: T | undefined;

          try {
            value = toData(cell);
          } catch (error) {
            log.info(
              "C1025",
              `Error while converting a CSV data row ${dataRowIndex}: ${error}`,
            );
          }
          if (value === undefined) {
            if (!skipInvalidRows) {
              throw new ValueError(
                `Invalid CSV data row ${dataRowIndex}: column conversion returned undefined`,
              );
            }
            continue csvLines;
          }
          rest.push(value);
        }

        empty = false;
        if (prev !== sentinel) {
          if (sorted && keyRaw < prev) {
            // ISSUE #231: We should check order after conversion to the key type.
            sorted = false;
            log.trace("C1005", "The data are not sorted by column 0");
          }
        }
        rows.push([(prev = key), ...rest]);
      }
    }
    if (empty || !headings) {
      throw new ValueError("No data to proceed");
    }

    if (!sorted) {
      rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
      sorted = true;
    }
    return new CSVFile(headings, rows, sorted);
  }
}
