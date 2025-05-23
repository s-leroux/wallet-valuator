import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { FakeOracle } from "../../support/oracle.fake.mjs";
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import type { Oracle } from "../../../src/services/oracle.mjs";
import { Caching, DB_VERSION } from "../../../src/services/oracles/caching.mjs";
import type { Price } from "../../../src/price.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import type { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import {
  FiatConverter,
  NullFiatConverter,
} from "../../../src/services/fiatconverter.mjs";
import { setLogLevel } from "../../../src/debug.mjs";

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
  const fiatCurrencies = [FakeFiatCurrency.EUR, FakeFiatCurrency.USD];
  let oracle: Oracle;
  let registry: CryptoRegistry;
  let fiatConverter: FiatConverter;

  /**
   * Check the prices are what we expect from our fake oracle.
   */
  function checkPrices(prices: Partial<Record<FiatCurrency, Price>>) {
    assert.equal(Object.values(prices).length, fiatCurrencies.length);
    assert.deepEqual(
      Object.values(prices).map((price: Price) => ({
        currency: price.fiatCurrency,
        amount: +price.rate,
      })),
      [
        { currency: fiatCurrencies[0], amount: 89809.00932731242 },
        { currency: fiatCurrencies[1], amount: 93663.44751964067 },
      ]
    );
  }

  beforeEach(function () {
    oracle = new FakeOracle();
    registry = CryptoRegistry.create();
    fiatConverter = new NullFiatConverter();
  });

  describe("Utilities", () => {
    it("should cache backend data", async function () {
      const cache = new Caching(oracle, ":memory:");
      let prices;
      assert.equal(cache.backend_calls, 0);
      prices = await cache.getPrice(
        registry,
        crypto,
        date,
        fiatCurrencies,
        fiatConverter
      );
      checkPrices(prices);
      assert.equal(cache.backend_calls, 1);
      prices = await cache.getPrice(
        registry,
        crypto,
        date,
        fiatCurrencies,
        fiatConverter
      );
      checkPrices(prices);
      assert.equal(cache.backend_calls, 1);
    });
  });
});
