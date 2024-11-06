import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;
import { CoinGecko } from "../../../src/services/oracles/coingecko.mjs";
import { mangle } from "../../../src/services/oracle.mjs";

const MOCHA_TEST_TIMEOUT = 60000;

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

    it("should map platform and contract to coin", async () => {
      const test_cases = [
        [
          mangle("xdai", "0x0aa1e96d2a46ec6beb2923de1e61addf5f5f1dce"),
          "realtoken-ecosystem-governance",
        ],
        [mangle("xdai", "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d"), "xdai"],
        ["bitcoin", "bitcoin"],
      ];

      for (const [key, id] of test_cases) {
        const coin = await coingecko.getCoin(key);
        assert.typeOf(coin, "object", `while accessing ${key} (${id})`);
        assert.include(coin, { id });
      }
    });

    it("should return historical prices", async function () {
      const test_cases = [
        [
          "bitcoin",
          "30-12-2023",
          { btc: 1, usd: 42074.70715618848, eur: 38057.70863986569 },
        ],
      ];

      for (const [id, date, expected] of test_cases) {
        const prices = await coingecko.getPrice(
          id,
          date,
          Object.keys(expected)
        );
        assert.deepEqual(prices, expected);
      }
    });
  });
});
