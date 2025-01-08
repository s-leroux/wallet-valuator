import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { Oracle } from "../../../src/services/oracle.mjs";
import { Caching } from "../../../src/services/oracles/caching.mjs";
import { Price } from "../../../src/price.mjs";
import { CryptoAsset } from "../../../src/cryptoasset.mjs";
import { FiatCurrency } from "../../../src/fiatcurrency.mjs";

class FakeOracle implements Oracle {
  readonly cryptos: Map<string, CryptoAsset>;

  constructor() {
    this.cryptos = new Map([
      ["bitcoin", new CryptoAsset("bitcoin", "BTC", "bitcoin", 18)],
    ]);
  }

  async getPrice(
    crypto: CryptoAsset,
    date: Date,
    currencies: FiatCurrency[]
  ): Promise<Record<FiatCurrency, Price>> {
    const data = { bitcoin: { EUR: 100, USD: 101, BTC: 1 } };
    const result = {} as Record<FiatCurrency, Price>;

    currencies.forEach(
      (currency) =>
        (result[currency] = new Price(
          this.cryptos.get(crypto.id)!,
          currency,
          (data as any)[crypto.id][currency] as number
        ))
    );

    return result;
  }
}

describe("Caching", function () {
  const date = new Date("2023-12-30");
  const crypto = new CryptoAsset("bitcoin", "BTC", "bitcoin", 18);
  const fiatCurrencies = ["eur", "usd"] as FiatCurrency[];
  let oracle: Oracle;

  /**
   * Check the prices are what we expect from our fake oracle.
   */
  function checkPrices(prices: Record<FiatCurrency, Price>) {
    assert.equal(Object.values(prices).length, fiatCurrencies.length);
    assert.deepEqual(
      Object.values(prices).map((price: Price) => ({
        currency: price.fiatCurrency,
        amount: price.rate,
      })),
      [
        { currency: fiatCurrencies[0], amount: 0 },
        { currency: fiatCurrencies[1], amount: 1 },
      ]
    );
  }

  beforeEach(function () {
    oracle = new FakeOracle();
  });

  describe("FakeOracle", () => {
    it("should return deterministic data", async function () {
      const prices = await oracle.getPrice(crypto, date, fiatCurrencies);
      checkPrices(prices);
    });
  });

  describe("Utilities", () => {
    it("should cache backend data", async function () {
      const cache = new Caching(oracle, ":memory:");
      let prices;
      assert.equal(cache.backend_calls, 0);
      prices = await cache.getPrice(crypto, date, fiatCurrencies);
      checkPrices(prices);
      assert.equal(cache.backend_calls, 1);
      prices = await cache.getPrice(crypto, date, fiatCurrencies);
      checkPrices(prices);
      assert.equal(cache.backend_calls, 1);
    });
  });
});
