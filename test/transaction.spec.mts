import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { Swarm } from "../src/swarm.mjs";
import { Address } from "../src/address.mjs";
import type { Explorer } from "../src/services/explorer.mjs";
import { TestScan } from "../src/services/explorers/testscan.mjs";
import { LazyCryptoResolver } from "../src/services/cryptoresolvers/lazycryptoresolver.mjs";
import { CryptoRegistry } from "../src/cryptoregistry.mjs";

import ERC20TokenTransferEvents from "../fixtures/ERC20TokenTransferEvents.json" assert { type: "json" };
import { ERC20TokenTransfer } from "../src/transaction.mjs";

const ADDRESS = "0xAddress";
const CHAIN_NAME = "MyChain";

describe("Swarm and Transaction integration", () => {
  const cryptoResolver = new LazyCryptoResolver();
  let explorer: Explorer;
  let registry: CryptoRegistry;
  let swarm: Swarm;

  beforeEach(() => {
    explorer = new TestScan(CHAIN_NAME);
    registry = CryptoRegistry.create();
    swarm = new Swarm([explorer], registry, cryptoResolver);
  });

  describe("NormalTransaction", () => {
    it("should lazy load", async () => {
      const TXHASH =
        "0x88a1301507e92a98d25f36fc2378905f3cb86b0baac1164d1cda007a924636e7";
      const transaction = await swarm.normalTransaction(
        explorer,
        registry,
        cryptoResolver,
        TXHASH
      );

      assert.deepEqual(transaction.data, {});
    });

    it("should load data on demand", async function () {
      const TXHASH =
        "0x88a1301507e92a98d25f36fc2378905f3cb86b0baac1164d1cda007a924636e7";
      const tr1 = await swarm.normalTransaction(
        explorer,
        registry,
        cryptoResolver,
        TXHASH
      );
      const tr2 = await tr1.load(swarm, registry, cryptoResolver);

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
          registry,
          cryptoResolver,
          hash
        );

        assert.equal(await tr.isValid(swarm, registry, cryptoResolver), ok);
      }
    });
  });

  describe("ERC20TokenTransfer", () => {
    let transaction: ERC20TokenTransfer;
    let transactionData: Record<string, any>;

    beforeEach(async () => {
      transactionData = ERC20TokenTransferEvents.result[0];
      transaction = await swarm.tokenTransfer(
        explorer,
        registry,
        cryptoResolver,
        transactionData
      );
    });

    it("should load transactions from data", () => {
      assert.deepEqual(transaction.data, transactionData);
    });

    it("should have a contract address", () => {
      assert.notEqual(transaction.contract, undefined);
    });

    it("should have an amount", () => {
      assert.notEqual(transaction.amount, undefined);
    });
    /*
    it("should load data on demand", async function () {
      const TXHASH =
        "0x88a1301507e92a98d25f36fc2378905f3cb86b0baac1164d1cda007a924636e7";
      const tr1 = await swarm.normalTransaction(
        explorer,
        registry,
        cryptoResolver,
        TXHASH
      );
      const tr2 = await tr1.load(swarm, registry, cryptoResolver);

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
          registry,
          cryptoResolver,
          hash
        );

        assert.equal(await tr.isValid(swarm, registry, cryptoResolver), ok);
      }
    });
  */
  });
});
