import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { as_coin } from "../../../src/geckocoin.mjs";
import { Swarm } from "../../../src/swarm.mjs";
import { TestScan } from "../../../src/services/explorers/testscan.mjs";
import { FakeCryptoResolver } from "../../support/cryptoresolver.fake.mjs";

describe("TestScan", function () {
  let cryptoResolver: FakeCryptoResolver;
  let explorer: TestScan;
  let sw: Swarm;

  beforeEach(() => {
    cryptoResolver = new FakeCryptoResolver();
    explorer = new TestScan();
    sw = new Swarm([explorer], cryptoResolver);
  });

  it("should default to the fake Gnosis chain", () => {
    assert.equal(explorer.chain, "gnosis-fake");
  });

  describe("normalTransaction()", () => {
    it("should load a transaction by its hash", async () => {
      const txhash =
        "0xc732d2593a010bace7333493dee5292fbb1aa1a6892c0dae420453a205825dcf";
      const transaction = await explorer.getNormalTransactionByHash(
        sw,
        cryptoResolver,
        txhash
      );

      assert.include(transaction, {
        type: "NORMAL",
        hash: txhash.toLowerCase(),
        isError: false,
        blockNumber: 14968030,
      });
    });
  });

  describe("internalTransactions()", () => {
    it("should load all transaction from/to an address", async () => {
      // < fixtures/InternalTransactions.json jq '[ .result[] | select((.from,.to) == "0x89344efa2d9953accd3e907eab27b33542ed9e25")] | length'
      const address = "0x89344efa2d9953accd3e907eab27b33542ed9e25";
      const transactions = await explorer.getInternalTransactionsByAddress(
        sw,
        cryptoResolver,
        address
      );

      assert.lengthOf(transactions, 145);
      for (const transaction of transactions) {
        // @ts-ignore
        assert.isTrue(
          transaction.to.address == address ||
            transaction.from.address == address
        );
        assert.include(transaction, {
          type: "INTERNAL",
        });
      }
    });
  });
});
