import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { as_coin } from "../../../src/coin.mjs";
import {
  GnosisScanProvider,
  GnosisScanAPI,
  GnosisScan,
} from "../../../src/services/explorers/gnosisscan.mjs";

const MOCHA_TEST_TIMEOUT = 60000;
const API_KEY = process.env["GNOSISSCAN_API_KEY"];

describe("GnosisScan", function () {
  if (!API_KEY) {
    throw Error("You must define the GNOSISSCAN_API_KEY environment variable");
  }

  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT);

  let provider;
  let gs;

  beforeEach(function () {
    provider = new GnosisScanProvider(API_KEY);
    gs = new GnosisScanAPI(provider);
  });

  describe("GnosisScanProvider", () => {
    it("should retry query if we hit the rate limit", async function () {
      this.timeout(0);
      assert.equal(provider.retries, 0);
      await Promise.all([
        gs.blockNoByTime(1578638524),
        gs.blockNoByTime(1578638524),
        gs.blockNoByTime(1578638524),
        gs.blockNoByTime(1578638524),
        gs.blockNoByTime(1578638524),
        gs.blockNoByTime(1578638524),
        gs.blockNoByTime(1578638524),
      ]);
      assert.isAbove(provider.retries, 0);
    });
  });

  describe("GnosisScanAPI", () => {
    it("should retrieve block by timestamp", async () => {
      const res = await gs.blockNoByTime(1578638524);

      assert.deepEqual(res, {
        status: "1",
        message: "OK",
        result: "7781276",
      });
    });
  });

  describe("Utilities", () => {});
});
