import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { Swarm } from "../src/swarm.mjs";
import { Address } from "../src/address.mjs";
import { Explorer } from "../src/services/explorer.mjs";
import { TestScan } from "../src/services/explorers/testscan.mjs";

const ADDRESS = "0xAddress";
const CHAIN_NAME = "MyChain";

describe("Swarm and Transaction integration", () => {
  let swarm: Swarm;
  let explorer: Explorer;

  beforeEach(() => {
    explorer = new TestScan(CHAIN_NAME);
    swarm = new Swarm([explorer]);
  });

  describe("NormalTransaction", () => {
    it("should lazy load", async () => {
      const TXHASH =
        "0x88a1301507e92a98d25f36fc2378905f3cb86b0baac1164d1cda007a924636e7";
      const transaction = await swarm.normalTransaction(explorer, TXHASH);

      assert.deepEqual(transaction.data, {});
    });

    it("should load data on demand", async function () {
      const TXHASH =
        "0x88a1301507e92a98d25f36fc2378905f3cb86b0baac1164d1cda007a924636e7";
      const tr1 = await swarm.normalTransaction(explorer, TXHASH);
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
        const tr = await swarm.normalTransaction(explorer, hash);

        assert.equal(await tr.isValid(swarm), ok);
      }
    });
  });
});
