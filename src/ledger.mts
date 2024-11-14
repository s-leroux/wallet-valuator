import { Transaction } from "./transaction.mjs";

type Sortable = { key };

/**
 * Sort an array by its item's key.
 * Do *not* remove duplicate values.
 */
export function sort<T extends Sortable>(arr: Array<T>) {
  arr = arr.slice(); // clone the array
  arr.sort((a, b) => (a.key > b.key ? 1 : a.key < b.key ? -1 : 0));

  return arr;
}

/**
 * Join two arrays based on their key.
 * Do *not* remove duplicate values.
 */
export function join<T extends Sortable>(a: Array<T>, b: Array<T>) {
  const dst: Array<T> = [];
  const la = a.length;
  let ia = 0;
  const lb = b.length;
  let ib = 0;

  let ka, kb;

  while (ia < la && ib < lb) {
    ka = a[ia].key;
    kb = b[ib].key;

    while (ka <= kb) {
      dst.push(a[ia++]);
      if (ia === la) break;

      ka = a[ia].key;
    }
    while (kb <= ka) {
      dst.push(b[ib++]);
      if (ib === lb) break;

      kb = b[ib].key;
    }
  }

  while (ia < la) {
    dst.push(a[ia++]);
  }

  while (ib < lb) {
    dst.push(b[ib++]);
  }

  return dst;
}

/**
 * A Ledger is an ordered list of transactions.
 */
export class Ledger implements Iterable<Transaction> {
  list: Array<Transaction>;

  constructor(list: Array<Transaction>) {
    this.list = list;
  }

  static create(list?: Ledger | Array<Transaction>) {
    if (list instanceof Ledger) return list;

    if (list === undefined) return new Ledger([]); // Should be a constant?

    // otherwise
    return new Ledger(list);
  }

  /**
   *`Create the union of thwo ledgers.
   */
  union(other: Ledger | Array<Transaction>) {
    const a = this.list;
    let b: Array<Transaction>;

    if (other instanceof Ledger) {
      b = other.list;
    } else {
      // Assume an _unsorted_ array of transactions.
      b = sort(other as Array<Transaction>);
    }

    return new Ledger(join(a, b));
  }

  *asCSV() {
    /**
     * Return a CSV representation of the ledger in a string
     */
    const sep = ",";
    const fields = ["timestamp", "blockNumber", "from", "to", "unit", "amount"];
    for (const tr of this.list) {
      yield fields.map((field) => tr[field]).join(sep);
    }
  }

  //========================================================================
  //  Array-like interface
  //========================================================================
  reduce(fn, acc) {
    let idx = 0;

    for (const tr of this.list) {
      acc = fn(acc, tr, idx++, this);
    }

    return acc;
  }

  *[Symbol.iterator](): IterableIterator<Transaction> {
    for (const tr of this.list) yield tr;
  }
}
