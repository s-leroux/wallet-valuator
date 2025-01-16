import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { as_coin } from "../../../src/geckocoin.mjs";
import { Swarm } from "../../../src/swarm.mjs";
import {
  GnosisScanProvider,
  GnosisScanAPI,
  GnosisScan,
} from "../../../src/services/explorers/gnosisscan.mjs";
import { FakeCryptoResolver } from "../../support/cryptoresolver.fake.mjs";

const MOCHA_TEST_TIMEOUT = 60000;
const API_KEY = process.env["GNOSISSCAN_API_KEY"];

describe("GnosisScan", function () {
  if (!API_KEY) {
    throw Error("You must define the GNOSISSCAN_API_KEY environment variable");
  }

  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT);

  const cryptoResolver = new FakeCryptoResolver();
  let provider: GnosisScanProvider | undefined;
  let gs: GnosisScanAPI | undefined;

  beforeEach(function () {
    provider = new GnosisScanProvider(API_KEY);
    gs = new GnosisScanAPI(provider);
  });

  describe("GnosisScanProvider", () => {
    it("should retry query if we hit the rate limit", async function () {
      this.timeout(0);
      assert.equal(provider!.retries, 0);
      await Promise.all([
        gs!.blockNoByTime(1578638524),
        gs!.blockNoByTime(1578638524),
        gs!.blockNoByTime(1578638524),
        gs!.blockNoByTime(1578638524),
        gs!.blockNoByTime(1578638524),
        gs!.blockNoByTime(1578638524),
        gs!.blockNoByTime(1578638524),
      ]);
      assert.isAbove(provider!.retries, 0);
    });
  });

  describe("GnosisScanAPI", () => {
    describe("blockNoByTime()", () => {
      it("should retrieve block by timestamp", async () => {
        const res = await gs!.blockNoByTime(1578638524);

        assert.deepEqual(res, {
          status: "1",
          message: "OK",
          result: "7781276",
        });
      });
      it("should fail if there is not block at the given timestamp", async () => {
        return assert.isRejected(gs!.blockNoByTime(1));
      });
    });
    describe("normalTransaction()", () => {
      it("should return a NormalTransaction given its hash", async () => {
        const txhash =
          "0xb76d2ba3313ebbfca1177846e791d91a3c7f675ba5c0cf8bb7ac2ad67403237c";
        const res = await gs!.normalTransaction(txhash);

        assert.include(res, {
          status: "1",
          message: "OK",
        });
        assert.include(res.result, {
          hash: txhash,
        });
      });
      it("should fail if the transaction is not found", async () => {
        const txhash =
          "0x000000000000000000000000000000000000000000000000000000000000000";
        return assert.isRejected(gs!.normalTransaction(txhash));
      });
    });
  });

  describe("GnosisScan", () => {
    let explorer: GnosisScan;
    let sw: Swarm;

    beforeEach(() => {
      explorer = new GnosisScan(gs!);
      sw = new Swarm([explorer], cryptoResolver);
    });

    it("should default to the Gnosis chain", () => {
      assert.equal(explorer.chain, "gnosis");
    });
    describe("normalTransaction()", () => {
      it("should load a transaction by its hash", async () => {
        const txhash =
          "0xb76d2ba3313ebbfca1177846e791d91a3c7f675ba5c0cf8bb7ac2ad67403237c";
        const transaction = await explorer.normalTransaction(
          sw,
          cryptoResolver,
          txhash
        );

        assert.include(transaction, {
          hash: txhash.toLowerCase(),
          isError: false,
          blockNumber: 24740464,
        });
      });
    });
  });
  describe("Utilities", () => {});
});
