import { ValueError } from "./error.mjs";

function check<T extends new (...args: Args) => any, Args extends any[]>(
  condition: boolean,
  errorClass: T,
  ...args: Args
): void {
  if (!condition) {
    throw new errorClass(...args);
  }
}

/**
 * Check if the elements of a tuple iterator are sorted by the first item of each tuple.
 */
function isSorted<K extends unknown, T extends readonly [K, ...unknown[]]>(
  it: Iterator<T>
) {
  let iter = it.next();
  let prev: K | undefined;
  while (!iter.done) {
    let curr: K = iter.value[0];
    if (curr < (prev ?? curr)) {
      return false;
    }
    prev = curr;
    iter = it.next();
  }

  return true;
}

/**
 * An ordered table of tuples.
 */
export class Table<K extends unknown, T extends readonly [K, ...unknown[]]>
  implements Iterable<T>
{
  table: T[];

  constructor(data: Iterable<T>) {
    const table = Array.from(data);

    // check pre-conditions
    check(
      table.length > 1,
      ValueError,
      "The table must contain at least one element"
    );
    check(isSorted(table.values()), ValueError, "The table must be sorted");

    this.table = table;
  }

  get(key: K): T | undefined {
    return bsearch(this.table, key);
  }

  toArray(): T[] {
    return this.table.slice();
  }

  [Symbol.iterator](): Iterator<T> {
    return this.table[Symbol.iterator]();
  }
}

export function bsearch<
  K extends unknown,
  R extends readonly [K, ...unknown[]]
>(haystack: R[], needle: K): R | undefined {
  let bestMatch: R | undefined = undefined;
  let start = 0;
  let end = haystack.length;
  while (start != end) {
    const middle = Math.floor((start + end) / 2);
    const row = haystack[middle];

    if (row[0] < needle) {
      bestMatch = row;
      start = middle + 1;
    } else if (row[0] > needle) {
      end = middle;
    } else {
      // Found !
      return row;
    }
  }

  return bestMatch;
}
