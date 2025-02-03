import { assert } from "chai";

import { Swarm } from "../src/swarm.mjs";
import { Explorer } from "../src/services/explorer.mjs";
import { LazyCryptoResolver } from "../src/services/cryptoresolvers/lazycryptoresolver.mjs";
import { Ledger, sort, join } from "../src/ledger.mjs";
import { ChainRecord, ERC20TokenTransfer } from "../src/transaction.mjs";
import { FakeExplorer } from "./fake-explorer.mjs";
import { CryptoRegistry } from "../src/cryptoregistry.mjs";

// From https://docs.gnosisscan.io/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
import NormalTransactions from "../fixtures/NormalTransactions.json" assert { type: "json" };
import InternalTransactions from "../fixtures/InternalTransactions.json" assert { type: "json" };
import ERC20TokenTransferEvents from "../fixtures/ERC20TokenTransferEvents.json" assert { type: "json" };

const UNISWAP_V2_ADDRESS = "0x01F4A4D82a4c1CF12EB2Dadc35fD87A14526cc79";
const DISPERSE_APP_ADDRESS = "0xd152f549545093347a162dce210e7293f1452150";

describe("Utilities", () => {
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
});

describe("Ledger", () => {
  let ledger: Ledger;
  let swarm: Swarm;
  let explorer: Explorer;
  let transactions: ChainRecord[];
  const cryptoResolver = LazyCryptoResolver.create();
  let registry: CryptoRegistry;

  beforeEach(async () => {
    ledger = Ledger.create();
    explorer = new FakeExplorer();
    registry = CryptoRegistry.create();
    swarm = new Swarm([explorer], registry, cryptoResolver);

    const a = await Promise.all(
      ERC20TokenTransferEvents.result.map((tr) => {
        return swarm.tokenTransfer(explorer, registry, cryptoResolver, tr);
      })
    );
    const b = await Promise.all(
      NormalTransactions.result.map((tr) =>
        swarm.normalTransaction(explorer, registry, cryptoResolver, tr.hash, tr)
      )
    );
    const c = await Promise.all(
      InternalTransactions.result.map((tr) =>
        swarm.internalTransaction(explorer, registry, cryptoResolver, tr)
      )
    );

    transactions = (a as ChainRecord[]).concat(b, c);
  });

  describe("constructor", () => {
    it("should create Ledger from Array<Transaction>", () => {
      const ledger = Ledger.create(transactions);

      // According to:
      // jq '.result | length' fixtures/*.json
      assert.equal(ledger.list.length, 745);
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
      const other = ledger.slice(10, 20);
      assert.deepEqual(other.list, ledger.list.slice(10, 20));
    });
  });

  describe("from method", () => {
    it("should return a new Ledger containing only transactions from the given address", async () => {
      /* Validation:
         jq '
              .result |
              map(select(.from == "0xd152f549545093347a162dce210e7293f1452150")) |
              length' fixtures/*.json
      */
      const ledger = Ledger.create(transactions);
      const address = await swarm.address(
        explorer,
        registry,
        cryptoResolver,
        DISPERSE_APP_ADDRESS
      );
      const subset = ledger.from(address);

      assert.notEqual(subset, ledger);
      assert.equal(subset.list.length, 48);
      for (const entry of subset) {
        assert.equal(entry.record.from, address);
      }
    });
  });

  describe("tag method", () => {
    it("should tag all entries in the ledger", () => {
      const ledger = Ledger.create(transactions).slice(0, 100);
      const subset = ledger.slice(2, 10);
      const sentinel = {};
      subset.tag("T", sentinel);

      let n = 0;
      for (const entry of ledger) {
        if (n < 2 || n >= 10) {
          assert.notInclude(entry.tags, "T");
        } else {
          assert.equal(entry.tags.get("T"), sentinel);
        }
      }
    });
  });

  describe("entries", () => {
    it("should have from and to addresses", () => {
      const ledger = Ledger.create(transactions);
      for (const entry of ledger) {
        assert.exists(entry.record.from);
        assert.exists(entry.record.to);
      }
    });

    it("should have their amount set", () => {
      const ledger = Ledger.create(transactions);
      for (const entry of ledger) {
        assert.exists(entry.record.amount);
      }
    });

    it("should be sorted by ascending timestamp", () => {
      const ledger = Ledger.create(transactions);
      let curr_ts = 0;
      for (const entry of ledger) {
        const entry_ts = entry.record.timeStamp;
        assert.exists(entry_ts);
        assert.isAtLeast(entry_ts, curr_ts);
        curr_ts = entry_ts;
      }
    });
  });
});

function s2k(str: string): Array<{ key: string }> {
  return Array.prototype.map.call(str, (c: string) => ({ key: c }));
}

function k2s(arr: Array<{ key: string }>): string {
  return arr.reduce((acc, i) => acc + i.key, "");
}
