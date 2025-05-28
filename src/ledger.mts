import { Portfolio } from "./portfolio.mjs";
import { Transaction } from "./transaction.mjs";
import { DisplayOptions, toDisplayString } from "./displayable.mjs";

import { logger } from "./debug.mjs";
import { Ensure } from "./type.mjs";
import { CryptoRegistry } from "./cryptoregistry.mjs";
import { ValueError } from "./error.mjs";
import { Logged } from "./errorutils.mjs";
const log = logger("ledger");

// =========================================================================
// Utilities
// =========================================================================
type Sortable = { key: string | number };

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

// =========================================================================
// Ledger and entries
// =========================================================================
type Filter = (
  registry: CryptoRegistry,
  entries: Entry[],
  value: any
) => Entry[];

const FILTERS: Record<string, Filter | undefined> = {
  // @ts-expect-error TypeScript does not handle properly null-prototype object literals
  __proto__: null,

  chain(registry: CryptoRegistry, entries: Entry[], chainName: unknown) {
    chainName = Ensure.isString(chainName);
    return entries.filter((entry) => {
      return entry.transaction.chainName === chainName;
    });
  },

  comment(registry: CryptoRegistry, entries: Entry[], chainName: unknown) {
    // NOOP
    return entries;
  },

  "crypto-asset"(
    registry: CryptoRegistry,
    entries: Entry[],
    cryptoId: unknown
  ) {
    cryptoId = Ensure.isString(cryptoId);
    return entries.filter((entry) => {
      return entry.transaction.amount.crypto.id === cryptoId;
    });
  },

  "crypto-resolver"(
    registry: CryptoRegistry,
    entries: Entry[],
    resolverName: unknown
  ) {
    resolverName = Ensure.isString(resolverName);
    return entries.filter((entry) => {
      return (
        registry.getNamespaceData(entry.transaction.amount.crypto, "STANDARD")
          ?.resolver === resolverName
      );
    });
  },

  from(registry: CryptoRegistry, entries: Entry[], address: unknown) {
    if (address === null) {
      address = "0x0000000000000000000000000000000000000000";
    } else {
      address = Ensure.isString(address).toLowerCase();
    }

    return entries.filter((entry) => {
      return entry.transaction.from.address === address;
    });
  },

  to(registry: CryptoRegistry, entries: Entry[], address: unknown) {
    if (address === null) {
      address = "0x0000000000000000000000000000000000000000";
    } else {
      address = Ensure.isString(address).toLowerCase();
    }

    return entries.filter((entry) => {
      return entry.transaction.to.address === address;
    });
  },

  type(registry: CryptoRegistry, entries: Entry[], type: unknown) {
    type = Ensure.isString(type);

    return entries.filter((entry) => {
      return entry.transaction.type === type;
    });
  },
} as const;

/**
 * An entry in the ledger.
 *
 * Entries are mutable entities, but transaction data are supposed immutable.
 * Altering the Entry in a ledger should not alter the entry pointing to the same transaction
 * in another unrelated ledger.
 */
export class Entry implements Sortable {
  transaction: Transaction;
  tags: Map<string, any>;

  key: string;

  constructor(transaction: Transaction) {
    this.transaction = transaction;
    this.tags = new Map();
    this.key =
      String(transaction.timeStamp).padStart(12) + transaction.chainName;
  }

  toString(): string {
    const transaction = this.transaction;
    return `${transaction.type[0]}:${this.key}:${transaction.from}:${transaction.to}:${transaction.amount}`;
  }

  toDisplayString(options: DisplayOptions): string {
    return toDisplayString(this.transaction, options);
  }

  tag(name: string, data: any = true) {
    this.tags.set(name, data);
  }
}

/**
 * A Ledger is an ordered list of transactions.
 */
export class Ledger implements Iterable<Entry> {
  entries: Array<Entry>;

  constructor(list: Array<Entry>) {
    this.entries = sort(list); // Enforce the list to be sorted
  }

  /**
   *  Create a ledger from zero, one, or more iterables
   */
  static create(...lists: Array<Iterable<Transaction>>) {
    const arrays: Array<Array<Entry>> = lists.map((it) =>
      Array.from(it, (tr) => new Entry(tr))
    );
    const entries: Array<Entry> = [];

    return new Ledger(entries.concat(...arrays));
  }

  /**
   *`Create the union of thwo ledgers.
   */
  union(other: Ledger | Array<Transaction>) {
    const a = this.entries;
    let b: Array<Entry>;

    if (other instanceof Ledger) {
      b = other.entries;
    } else {
      // Assume an _unsorted_ array of transactions.
      b = sort(other.map((item) => new Entry(item)));
    }

    return new Ledger(join(a, b));
  }

  //========================================================================
  //  String representation
  //========================================================================
  toDisplayString(options: DisplayOptions): string {
    return this.entries
      .map(
        (entry, idx) =>
          `${String(idx).padStart(6)} ${entry.toDisplayString(options)}`
      )
      .join("\n");
  }

  *asCSV() {
    /**
     * Return a CSV representation of the ledger in a string
     */
    const sep = ",";
    const fields = ["timestamp", "blockNumber", "from", "to", "unit", "amount"];
    for (const tr of this.entries) {
      yield fields.map((field) => (tr as any)[field]).join(sep);
    }
  }

  //========================================================================
  //  Conversion
  //========================================================================
  portfolio() {
    return Portfolio.createFromLedger(this);
  }

  //========================================================================
  //  Tagging
  //========================================================================
  tag(name: string, data?: any) {
    for (const entry of this.entries) {
      entry.tag(name, data);
    }
  }

  //========================================================================
  //  Transaction selection
  //========================================================================

  filter(registry: CryptoRegistry, selector: Record<string, any>): Ledger {
    let entries = this.entries;
    for (const key of Object.keys(selector)) {
      const fn = FILTERS[key];

      if (fn) {
        entries = fn(registry, entries, selector[key]);
      } else {
        throw Logged("C2004", ValueError, `Unknown filter key: ${key}`);
      }
    }
    return new Ledger(entries);
  }
  /**
   * Return a new Ledger containing only events from the given address.
   */
  from(account: { chain: string; address: string }): Ledger {
    // Above: we do not accept 'string' addresses because we also need the chain.

    // Swarm should ensure the uniqueness of the address object
    const entries = this.entries.filter(
      (entry) =>
        entry.transaction.from.address === account.address &&
        entry.transaction.from.chain === account.chain
    );

    return new Ledger(entries);
  }

  /**
   * Return a new Ledger containing only events to the given address.
   */
  to(account: { chain: string; address: string }): Ledger {
    // Above: we do not accept 'string' addresses because we also need the chain.

    // Swarm should ensure the uniqueness of the address object
    const entries = this.entries.filter(
      (entry) =>
        entry.transaction.to.address === account.address &&
        entry.transaction.to.chain === account.chain
    );

    return new Ledger(entries);
  }

  //========================================================================
  //  Array-like interface
  //========================================================================
  slice(start?: number, end?: number) {
    return new Ledger(this.entries.slice(start, end));
  }

  reduce(fn: Function, acc: any) {
    // ISSUE #30 Fix types
    let idx = 0;

    for (const tr of this.entries) {
      acc = fn(acc, tr, idx++, this);
    }

    return acc;
  }

  *[Symbol.iterator](): IterableIterator<Entry> {
    for (const tr of this.entries) yield tr;
  }
}
