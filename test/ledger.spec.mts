import { assert } from "chai";

import { Swarm } from "../src/swarm.mjs";
import { Explorer } from "../src/services/explorer.mjs";
import { Ledger, sort, join } from "../src/ledger.mjs";
import { ERC20TokenTransfer } from "../src/transaction.mjs";
import { FakeExplorer } from "./fake-explorer.mjs";

// From https://docs.gnosisscan.io/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
import ERC20TokenTransferEvents from "../fixtures/ERC20TokenTransferEvents.json" assert { type: "json" };

describe("The Ledger", () => {
  let ledger;
  let swarm;
  let explorer;
  let transactions;

  beforeEach(() => {
    ledger = Ledger.create();
    explorer = new FakeExplorer();
    swarm = new Swarm([explorer]);
    transactions = ERC20TokenTransferEvents.result.map((tr) =>
      new ERC20TokenTransfer(swarm, explorer).assign(swarm, tr)
    );
  });

  describe("constructor", () => {
    it("should create Ledger from Array<Transaction>", () => {
      const ledger = Ledger.create(transactions);
      assert.equal(ledger.list.length, 100); // our fixture has 100 entries
    });
  });

  describe("union method", () => {
    it("should accept arrays of transactions", () => {
      ledger.union(transactions);
    });

    it("should accept another ledger", () => {
      const other = Ledger.create();
      ledger.union(other);
    });
  });
  describe("slice method", () => {
    it("should return a slice of the same entries", () => {
      const ledger = Ledger.create(transactions);

      assert.equal(ledger.list.length, 100); // our fixture has 100 entries
      const other = ledger.slice(10, 20);

      assert.deepEqual(other.list, ledger.list.slice(10, 20));
    });
  });
});

function s2k(str: string) {
  return Array.prototype.map.call(str, (c) => ({ key: c }));
}

function k2s(arr) {
  return arr.reduce((acc, i) => acc + i.key, "");
}

describe("The sort function", () => {
  describe("ensures that", () => {
    const useCases = [
      ["", ""],
      ["A", "A"],
      ["BACDFE", "ABCDEF"],
      ["BBAACDFEEE", "AABBCDEEEF"],
      ["AFECDBAEBE", "AABBCDEEEF"],
    ] as const;

    for (let [src, expected] of useCases) {
      it(`"${src}" is sorted as "${expected}"`, () => {
        const res = sort(s2k(src));
        assert.equal(k2s(res), expected);
      });
    }
  });
});

describe("The join function", () => {
  describe("ensures that", () => {
    const useCases = [
      ["", "", ""],
      ["", "ABC", "ABC"],
      ["ABC", "", "ABC"],
      ["ABC", "ABC", "AABBCC"],
      ["ABC", "DEF", "ABCDEF"],
      ["DEF", "ABC", "ABCDEF"],
      ["CDEF", "ABC", "ABCCDEF"],
      ["DEF", "ABCD", "ABCDDEF"],
      ["ACE", "BDF", "ABCDEF"],
    ] as const;

    for (let [left, right, expected] of useCases) {
      it(`"${left}" ∪ "${right}" = "${expected}"`, () => {
        const res = join(s2k(left), s2k(right));
        assert.equal(k2s(res), expected);
      });
    }
  });
});
