import { assert } from "chai";

import { Swarm } from "../src/swarm.mjs";
import { Explorer } from "../src/services/explorer.mjs";
import { Ledger, sort, join } from "../src/ledger.mjs";
import { ERC20TokenTransfer } from "../src/transaction.mjs";

const ERC20TokenTransferEvents = {
  // From https://docs.gnosisscan.io/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
  status: "1",
  message: "OK",
  result: [
    {
      blockNumber: "20331617",
      timeStamp: "1643313335",
      hash: "0x12bd3a674aea6ffaf2f5a0d4f6614a4b429aadcb92d75cee31139bfad6c76829",
      nonce: "35",
      blockHash:
        "0xfeb05d7771c014c7d425a6e8cc4be24e274fb5a1c561bb54371de2d0bdb3da3b",
      from: "0xb26dbd3efdee329162c8b3b18bb7b5b11452ea7e",
      contractAddress: "0x524b969793a64a602342d89bc2789d43a016b13a",
      to: "0x3cc47c557e985cb8b52d1e263a1296fd2097121c",
      value: "650000000000000000000",
      tokenName: "Donut on xDai",
      tokenSymbol: "DONUT",
      tokenDecimal: "18",
      transactionIndex: "0",
      gas: "62901",
      gasPrice: "10000000000",
      gasUsed: "60132",
      cumulativeGasUsed: "60132",
      input: "deprecated",
      confirmations: "4408848",
    },
    {
      blockNumber: "20331663",
      timeStamp: "1643313565",
      hash: "0x924f9e3d7e8bcbb5ad504ee73bb57732a9250c4b553d8f1318664de00b8b6015",
      nonce: "1",
      blockHash:
        "0xd28b8455a2f550ba3e524b3cb7817c5401bd52c25bfee1943a38bda8244951d9",
      from: "0x3cc47c557e985cb8b52d1e263a1296fd2097121c",
      contractAddress: "0x524b969793a64a602342d89bc2789d43a016b13a",
      to: "0xf7927bf0230c7b0e82376ac944aeedc3ea8dfa25",
      value: "1000000000000000000",
      tokenName: "Donut on xDai",
      tokenSymbol: "DONUT",
      tokenDecimal: "18",
      transactionIndex: "0",
      gas: "57206",
      gasPrice: "10000000000",
      gasUsed: "53816",
      cumulativeGasUsed: "53816",
      input: "deprecated",
      confirmations: "4408802",
    },
  ],
};

class FakeExplorer extends Explorer {
  constructor() {
    super("gnosis");
  }
}

describe("The Ledger", () => {
  let ledger;
  let swarm;

  beforeEach(() => {
    ledger = Ledger.create();
    swarm = new Swarm([new FakeExplorer()]);
  });

  describe("union method", () => {
    it("should accept arrays of transactions", () => {
      const transactions = [
        new ERC20TokenTransfer(
          swarm,
          "gnosis",
          ERC20TokenTransferEvents.result[0]
        ),
        new ERC20TokenTransfer(
          swarm,
          "gnosis",
          ERC20TokenTransferEvents.result[1]
        ),
      ];

      ledger.union(transactions);
    });

    it("should accept another ledger", () => {
      const other = Ledger.create();
      ledger.union(other);
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
