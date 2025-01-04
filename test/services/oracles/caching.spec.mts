import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { Oracle } from "../../../src/services/oracle.mjs";
import { Caching } from "../../../src/services/oracles/caching.mjs";
import { Price } from "../../../src/price.mjs";
import { GeckoCoin, get_coin_by_oracle_id } from "../../../src/geckocoin.mjs";

class FakeOracle implements Oracle {
  seq: number = 0;

  async getPrice(
    coin: GeckoCoin,
    date: string,
    currencies: string[]
  ): Promise<Record<string, Price>> {
    const result: Record<string, Price> = {};
    currencies.forEach(
      (currency) => (result[currency] = new Price(coin, currency, this.seq++))
    );
    return result;
  }
}

describe("Caching", function () {
  const date = "30-12-2023";
  const coin = get_coin_by_oracle_id("bitcoin");
  const currencies = ["eur", "usd"];
  let oracle: Oracle;

  /**
   * Check the prices are what we expect from our fake oracle.
   */
  function checkPrices(prices: Record<string, Price>) {
    assert.equal(Object.values(prices).length, currencies.length);
    assert.deepEqual(
      Object.values(prices).map((price: Price) => ({
        currency: price.currency,
        amount: price.amount,
      })),
      [
        { currency: currencies[0], amount: 0 },
        { currency: currencies[1], amount: 1 },
      ]
    );
  }

  beforeEach(function () {
    oracle = new FakeOracle();
  });

  describe("FakeOracle", () => {
    it("should return deterministic data", async function () {
      const prices = await oracle.getPrice(coin, date, currencies);
      checkPrices(prices);
    });
  });

  describe("Utilities", () => {
    it("should cache backend data", async function () {
      const cache = new Caching(oracle, ":memory:");
      let prices;
      assert.equal(cache.backend_calls, 0);
      prices = await cache.getPrice(coin, date, currencies);
      checkPrices(prices);
      assert.equal(cache.backend_calls, 1);
      prices = await cache.getPrice(coin, date, currencies);
      checkPrices(prices);
      assert.equal(cache.backend_calls, 1);
    });
  });
});
