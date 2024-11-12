import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;
import { CoinGecko } from "../../../src/services/oracles/coingecko.mjs";
import { as_coin } from "../../../src/coin.mjs";
import { mangle } from "../../../src/services/oracle.mjs";

const MOCHA_TEST_TIMEOUT = 60000;

describe("CoinGecko", function () {
  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT);

  let coingecko;

  beforeEach(function () {
    coingecko = new CoinGecko();
  });

  describe("API", () => {});

  describe("Utilities", () => {
    it("should return historical prices", async function () {
      const test_cases = [
        [
          "bitcoin",
          "30-12-2023",
          { btc: 1, usd: 42074.70715618848, eur: 38057.70863986569 },
        ],
      ];

      for (const [id, date, expected] of test_cases) {
        const coin = as_coin(id);
        const prices = await coingecko.getPrice(
          coin,
          date,
          Object.keys(expected)
        );
        assert.equal(prices.length, Object.keys(expected).length);
        for (const price of prices) {
          assert.equal(price.coin, coin);
          assert.equal(price.amount, expected[price.currency]);
        }
      }
    });
  });
});
