// ===========================================================================
//  Imports
// ===========================================================================
import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";
import { DefaultDefiLlamaAPI } from "../../../src/services/defillama/defillamaapi.mjs";

// ===========================================================================
//  Constants
// ===========================================================================
const MOCHA_TEST_TIMEOUT = 10000;

const api = DefaultDefiLlamaAPI.create();
const DATE = "2023-10-01";
const TOKENS = [
  "ethereum:0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
  "ethereum:0xA0b86991C6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  "coingecko:bitcoin",
];

// ===========================================================================
//  Tests
// ===========================================================================
describe("DefiLlama API", function () {
  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT / 2);

  const date = new Date(DATE);
  describe("getHistoricalPrices()", function () {
    const register = prepare(this);

    register("should retrieve prices for known tokens", async () => {
      const result = await api.getHistoricalPrices(date, TOKENS);

      assert.isObject(result);
      assert.isObject(result.coins);

      for (const token of TOKENS) {
        assert.property(result.coins, token);
        const data = result.coins[token];
        assert.containsAllKeys(data, ["price", "symbol", "timestamp"]);
        assert.isAbove(data.price, 0);
        assert.closeTo(data.timestamp * 1000, date.getTime(), 1000 * 1000);
      }
    });

    register("should handle unknown tokens gracefully", async () => {
      const UNKNOWN = ["ethereum:0x000000000000000000000000000000000000dead"];
      const result = await api.getHistoricalPrices(date, UNKNOWN);

      assert.isObject(result);
      assert.isObject(result.coins);
      assert.notProperty(result.coins, UNKNOWN[0]);
    });
  });
});
