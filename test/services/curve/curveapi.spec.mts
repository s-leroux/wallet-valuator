import { assert } from "chai";

import {
  DefaultCurveAPI,
  CurveProvider,
  CurveAPI,
} from "../../../src/services/curve/curveapi.mjs";

const MOCHA_TEST_TIMEOUT = 4000;

describe("DefaultCurveAPI", function () {
  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT / 2);

  let provider: CurveProvider;
  let api: CurveAPI;

  beforeEach(() => {
    provider = new CurveProvider();
    api = new DefaultCurveAPI(provider);
  });

  describe("getPrice()", function () {
    it("should return the price of a token", async function () {
      const CHAIN = "ethereum";
      const TOKEN = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6e490";
      const DATE = "2025-03-02";
      const EXPECTED = {
        address: TOKEN,
        data: [
          {
            price: 1.0397308967364005,
            timestamp: `${DATE}T00:00:00`,
          },
        ],
      };

      const result = await api.getUSDPrice(CHAIN, TOKEN, new Date(DATE));

      assert.deepEqual(result, EXPECTED);
    });
  });

  describe("getChains()", function () {
    it("should return all the supported chains", async function () {
      const result = await api.getChains();

      assert.isArray(result.data);
      assert(result.data.find((chain) => chain.name === "ethereum"));
      assert(result.data.find((chain) => chain.name === "xdai"));
    });
  });
});
