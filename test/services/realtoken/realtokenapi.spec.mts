import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import {
  RealTokenProvider,
  DefaultRealTokenAPI,
} from "../../../src/services/realtoken/realtokenapi.mjs";

const MOCHA_TEST_TIMEOUT = 4000;

describe("RealTokenAPI", function () {
  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT / 2);

  describe("token()", function () {
    it("should return a list of token:", async function () {
      const provider = new RealTokenProvider();
      const api = new DefaultRealTokenAPI(provider);

      const actual = await api.token();

      assert.isTrue(Array.isArray(actual), `${actual} should be an array`);
      for (const item of actual) {
        assert.containsAllKeys(item, [
          "fullName",
          "shortName",
          "symbol",
          "productType",
          "tokenPrice",
          "currency",
          "uuid",
          "ethereumContract",
          "xDaiContract",
          "gnosisContract",
        ]);
      }
    });
  });

  describe("tokenHistory()", function () {
    it("should return a list of token:", async function () {
      const provider = new RealTokenProvider();
      const api = new DefaultRealTokenAPI(provider);

      const actual = await api.tokenHistory();

      assert.isTrue(Array.isArray(actual), `${actual} should be an array`);
      for (const item of actual) {
        assert.containsAllKeys(item, ["uuid", "history"]);
        for (const event of item.history) {
          assert.containsAllKeys(event, ["date", "values"]);
        }
      }
    });
  });
});
