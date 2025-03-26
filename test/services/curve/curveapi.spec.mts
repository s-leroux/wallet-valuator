import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import {
  CurveAPI,
  CurveProvider,
} from "../../../src/services/curve/curveapi.mjs";

const MOCHA_TEST_TIMEOUT = 4000;

describe("CurveAPI", function () {
  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT / 2);

  describe("getPrice()", function () {
    it("should return the price of a token", async function () {
      const provider = new CurveProvider();
      const api = new CurveAPI(provider);

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

      const actual = await api.getUSDPrice(CHAIN, TOKEN, new Date(DATE));

      assert.deepEqual(actual, EXPECTED);
    });
  });
});
