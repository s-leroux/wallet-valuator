import { NotImplementedError } from "./error.mjs";
import { ChainRecord } from "./transaction.mjs";
import { Address } from "./address.mjs";

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
 * An entry in the ledger.
 *
 * Entries are mutable entities, but transaction data are supposed immutable.
 * Altering the Entry in a ledger should not alter the entry pointing to the same transaction
 * in another unrelated ledger.
 */
class Entry implements Sortable {
  record: ChainRecord;
  tags: Map<string, any>;

  key: string;

  constructor(record: ChainRecord) {
    this.record = record;
    this.tags = new Map();
    const data = record.data as any;
    this.key =
      data.timeStamp.padStart(12) +
      record.explorer.chain +
      data.blockNumber.padStart(12) +
      (data.nonce ?? "0").padStart(10);
  }

  toString(): string {
    const record = this.record;
    return `${record.type[0]}:${this.key}:${record.from}:${record.to}:${record.amount}`;
  }

  tag(name: string, data?: any) {
    this.tags.set(name, data);
  }
}

/**
 * A Ledger is an ordered list of transactions.
 */
export class Ledger implements Iterable<Entry> {
  list: Array<Entry>;

  constructor(list: Array<Entry>) {
    this.list = sort(list); // Enforce the list to be sorted
  }

  /**
   *  Create a ledger from zero, one, or more iterables
   */
  static create(...lists: Array<Iterable<ChainRecord>>) {
    const arrays: Array<Array<Entry>> = lists.map((it) =>
      Array.from(it, (tr) => new Entry(tr))
    );
    const entries: Array<Entry> = [];

    return new Ledger(entries.concat(...arrays));
  }

  /**
   *`Create the union of thwo ledgers.
   */
  union(other: Ledger | Array<ChainRecord>) {
    const a = this.list;
    let b: Array<Entry>;

    if (other instanceof Ledger) {
      b = other.list;
    } else {
      // Assume an _unsorted_ array of transactions.
      b = sort(other.map((item) => new Entry(item)));
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
  //  Tagging
  //========================================================================
  tag(name: string, data?: any) {
    for (const entry of this.list) {
      entry.tag(name, data);
    }
  }

  //========================================================================
  //  Transaction selection
  //========================================================================

  /**
   * Return a new Ledger containing only events from the given address.
   */
  from(address: Address): Ledger {
    // Above: we do not accept 'string' addresses because we also need the chain.

    // Swarm should ensure the uniqueness of the address object
    const entries = this.list.filter((entry) => entry.record.from === address);

    return new Ledger(entries);
  }

  //========================================================================
  //  Array-like interface
  //========================================================================
  slice(start?: number, end?: number) {
    return new Ledger(this.list.slice(start, end));
  }

  reduce(fn, acc) {
    let idx = 0;

    for (const tr of this.list) {
      acc = fn(acc, tr, idx++, this);
    }

    return acc;
  }

  *[Symbol.iterator](): IterableIterator<Entry> {
    for (const tr of this.list) yield tr;
  }
}
