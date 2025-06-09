import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import { FakeOracle } from "../../support/oracle.fake.mjs";
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import type { Oracle } from "../../../src/services/oracle.mjs";
import { Caching, DB_VERSION } from "../../../src/services/oracles/caching.mjs";
import type { Price } from "../../../src/price.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import type { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import { setLogLevel } from "../../../src/debug.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";

describe("Database", function () {
  // Testing database core features

  let db: Caching;
  beforeEach(function () {
    const restore = setLogLevel("warn");
    // Create the DB. Let crash if low-level methods do need a valid Oracle.
    db = new Caching(null as unknown as Oracle, ":memory:");
    restore();
  });

  it("should report the current version", function () {
    assert.equal(db.dbVersion(), DB_VERSION);
  });

  it("should store and retrieve arbirary strings in the dictionary", function () {
    const words = [
      "test_dictionary",
      "price_cache",
      "oracle_data",
      "crypto_asset",
      "fiat_currency",
    ];
    const set1 = words.map((word) => db.dictionary(word));
    const set2 = words.map((word) => db.dictionary(word));
    assert.deepEqual(set1, set2);
  });
});

describe("Caching", function () {
  const date = new Date("2024-12-30");
  const crypto = FakeCryptoAsset.bitcoin;
  const { EUR, USD } = FakeFiatCurrency;
  const fiatCurrencies = new Set([EUR, USD]);
  let oracle: Oracle;
  let registry: CryptoRegistry;

  /**
   * Check the prices are what we expect from our fake oracle.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function checkPrices(prices: Map<FiatCurrency, Price>) {
    // What is the purpose of that function?
    assert.equal(prices.size, fiatCurrencies.size);
    assert.deepEqual(
      Array.from(prices.values()).map((price: Price) => ({
        currency: price.fiatCurrency,
        amount: +price.rate,
      })),
      [
        { currency: EUR, amount: 89809.00932731242 },
        { currency: USD, amount: 93663.44751964067 },
      ]
    );
  }

  beforeEach(function () {
    oracle = new FakeOracle();
    registry = CryptoRegistry.create();
  });

  describe("Utilities", () => {
    it("should cache backend data", async function () {
      const cache = new Caching(oracle, ":memory:");
      let priceMap: PriceMap;
      assert.equal(cache.backend_calls, 0);
      priceMap = new Map() as PriceMap;
      await cache.getPrice(registry, crypto, date, fiatCurrencies, priceMap);
      assert.equal(priceMap.size, 2);
      assert.equal(cache.backend_calls, 1);
      priceMap = new Map() as PriceMap;
      await cache.getPrice(registry, crypto, date, fiatCurrencies, priceMap);
      assert.equal(priceMap.size, 2);
      assert.equal(cache.backend_calls, 1);
    });
  });
});
