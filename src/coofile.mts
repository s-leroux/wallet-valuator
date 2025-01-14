import { readFile } from "node:fs/promises";

import { NotImplementedError, ValueError } from "./error.mjs";
import { bsearch } from "./bsearch.mjs";

type Row = [string, string];
type Column = Row[];

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

/**
 * Read and parse COO file.
 *
 * This file format is not standard, but it resembles a coordinate list (COO)
 * representation commonly used in sparse matrix libraries.
 *
 * In this format data point are represented as (row, column, value) triples,
 * one per line.
 */
export class COOFile {
  constructor(private columns: Map<string, Column>) {}

  get(row: string, col: string): Row | undefined {
    const column = this.columns.get(col);
    if (!column) {
      return undefined;
    }

    return bsearch(column, row);
  }

  static createFromPath(path: string): Promise<COOFile> {
    return readFile(path, { encoding: "utf8" }).then((text) =>
      COOFile.createFromText(text)
    );
  }

  static createFromText(text: string): COOFile {
    const columns = new Map<string, Column>();
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
          if (date <= prev) {
            throw new ValueError(
              "Data must be stored in strictly ascending order"
            );
          }
        }

        column.push([date, value]);

        rest = tail;
      }
    }

    if (empty) {
      throw new ValueError("Data cannot be empty");
    }
    return new COOFile(columns);
  }
}
