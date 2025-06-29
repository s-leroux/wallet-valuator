import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import { Swarm } from "../src/swarm.mjs";
import { Address } from "../src/address.mjs";
import type { Explorer } from "../src/services/explorer.mjs";
import { TestScan } from "../src/services/explorers/testscan.mjs";
import { LazyCryptoResolver } from "../src/services/cryptoresolvers/lazycryptoresolver.mjs";
import { CryptoRegistryNG, CryptoMetadata } from "../src/cryptoregistry.mjs";
import { Blockchain } from "../src/blockchain.mjs";

import ERC20TokenTransfersFixture from "../fixtures/ERC20TokenTransferEvents.json" with { type: "json" };
import internalTransactionsFixture from "../fixtures/InternalTransactions.json" with { type: "json" };
import normalTransactionsFixture from "../fixtures/NormalTransactions.json" with { type: "json" };

import {
  ERC20TokenTransfer,
  InternalTransaction,
  NormalTransaction,
} from "../src/transaction.mjs";
import { asBlockchain } from "../src/blockchain.mjs";

const CHAIN_NAME = "MyChain";

describe("Swarm and Transaction integration", () => {
  let swarm: Swarm;
  let cryptoRegistry: CryptoRegistryNG;
  let cryptoResolver: LazyCryptoResolver;
  let cryptoMetadata: CryptoMetadata;
  let explorer: Explorer;
  let chain: Blockchain;

  beforeEach(() => {
    chain = asBlockchain(CHAIN_NAME);
    cryptoRegistry = CryptoRegistryNG.create();
    cryptoMetadata = CryptoMetadata.create();
    cryptoResolver = LazyCryptoResolver.create();
    explorer = new TestScan(cryptoRegistry, chain);
    swarm = Swarm.create([explorer], cryptoRegistry, cryptoMetadata, cryptoResolver);
  });

  describe("NormalTransaction", () => {
    it("should lazy load", async () => {
      const TXHASH =
        "0x88a1301507e92a98d25f36fc2378905f3cb86b0baac1164d1cda007a924636e7";
      const transaction = await swarm.normalTransaction(chain, TXHASH);

      assert.deepEqual(transaction.data, {});
    });

    it("should load data on demand", async function () {
      const TXHASH =
        "0x88a1301507e92a98d25f36fc2378905f3cb86b0baac1164d1cda007a924636e7";
      const tr1 = await swarm.normalTransaction(chain, TXHASH);
      const tr2 = await tr1.load(swarm);

      assert.equal(tr1, tr2);
      assert.include(tr1.data, {
        blockNumber: "14823883",
        timeStamp: "1614763500",
        isError: "0",
      });
      assert.instanceOf(tr1.from, Address);
      assert.instanceOf(tr1.to, Address);
    });

    it("should implicitly load data when calling isValid()", async function () {
      const testCases: [string, boolean][] = [
        [
          "0x88a1301507e92a98d25f36fc2378905f3cb86b0baac1164d1cda007a924636e7",
          true,
        ],
        [
          "0x0440ed430ce248e31d80580cee995d52e16b842dbea62e8094e973091cb3154b",
          false,
        ],
      ];
      for (const [hash, ok] of testCases) {
        const tr = await swarm.normalTransaction(chain, hash);

        assert.equal(await tr.isValid(swarm), ok);
      }
    });

    describe("NormalTransaction", () => {
      let transactions: NormalTransaction[];

      beforeEach(async () => {
        const transactionData = normalTransactionsFixture.result;
        transactions = await Promise.all(
          transactionData.map((tr) =>
            swarm.normalTransaction(chain, tr.hash, tr)
          )
        );
      });

      it("should have an amount", () => {
        for (const transaction of transactions)
          assert.notEqual(transaction.amount, undefined);
      });
    });
  });

  describe("InternalTransaction", () => {
    let transactions: InternalTransaction[];

    beforeEach(async () => {
      const transactionData = internalTransactionsFixture.result;
      transactions = await Promise.all(
        transactionData.map((tr) => swarm.internalTransaction(chain, tr.hash, tr.traceId, tr))
      );
    });

    it("should have an amount", () => {
      for (const transaction of transactions)
        assert.notEqual(transaction.amount, undefined);
    });
  });

  describe("ERC20TokenTransfer", () => {
    let transactions: ERC20TokenTransfer[];

    beforeEach(async () => {
      const transactionData = ERC20TokenTransfersFixture.result;
      transactions = await Promise.all(
        transactionData.map((tr) => swarm.tokenTransfer(chain, tr))
      );
    });

    it("should load transactions from data", () => {
      for (let i = 0; i < transactions.length; ++i)
        assert.deepEqual(transactions[i].data, ERC20TokenTransfersFixture.result[i]);
    });

    it("should have a contract address", () => {
      for (const transaction of transactions)
        assert.notEqual(transaction.contract, undefined);
    });

    it("should have an amount", () => {
      for (const transaction of transactions)
        assert.notEqual(transaction.amount, undefined);
    });
    /*
    it("should load data on demand", async function () {
      const TXHASH =
        "0x88a1301507e92a98d25f36fc2378905f3cb86b0baac1164d1cda007a924636e7";
      const tr1 = await swarm.normalTransaction(
        explorer,
        TXHASH
      );
      const tr2 = await tr1.load(swarm);

      assert.equal(tr1, tr2);
      assert.include(tr1.data, {
        blockNumber: "14823883",
        timeStamp: "1614763500",
        isError: "0",
      });
      // @ts-ignore
      assert.instanceOf(tr1.from, Address);
      // @ts-ignore
      assert.instanceOf(tr1.to, Address);
    });

    it("should implicitly load data when calling isValid()", async function () {
      const testCases: [string, boolean][] = [
        [
          "0x88a1301507e92a98d25f36fc2378905f3cb86b0baac1164d1cda007a924636e7",
          true,
        ],
        [
          "0x0440ed430ce248e31d80580cee995d52e16b842dbea62e8094e973091cb3154b",
          false,
        ],
      ];
      for (const [hash, ok] of testCases) {
        const tr = await swarm.normalTransaction(
          explorer,
          hash
        );

        assert.equal(await tr.isValid(swarm), ok);
      }
    });
  */
  });
});
