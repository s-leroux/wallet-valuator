import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;
import { CoinGecko } from "../../../src/services/oracles/coingecko.mjs";

const MOCHA_TEST_TIMEOUT = 5000;

describe("CoinGecko", function () {
  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT);

  let coingecko;

  beforeEach(function () {
    coingecko = new CoinGecko();
  });

  describe("API", () => {
    it("should expose the coins/list endpoint", async function () {
      const coin_list = await coingecko.coinList();

      assert.typeOf(coin_list, "array");
      for (const coin of coin_list) {
        assert.containsAllKeys(coin, ["id", "symbol", "name"]);
      }
    });
  });

  describe("Utilities", () => {
    it("should map symbols to id", async () => {
      const test_cases = [
        ["reg", "realtoken-ecosystem-governance"],
        ["xdai", "xdai"],
        ["btc", "bitcoin"],
      ];

      for (const [symbol, id] of test_cases) {
        const ids = await coingecko.symbolToIds(symbol);
        assert.typeOf(ids, "array");
        assert.include(ids, id);
      }
    });
  });
});
