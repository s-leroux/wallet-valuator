import { assert } from "chai";

import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "./support/fiatcurrency.fake.mjs";
import { Price } from "../src/price.mjs";

describe("Price", () => {
  const { ethereum } = FakeCryptoAsset;
  const { EUR: eur, USD: usd } = FakeFiatCurrency;

  describe("constructor", () => {
    it("should correctly initialize a price instance", () => {
      const price = new Price(ethereum, eur, 3000);

      assert.strictEqual(price.crypto, ethereum);
      assert.strictEqual(price.fiatCurrency, eur);
      assert.strictEqual(+price.rate, 3000);
      assert.strictEqual(price.confidence, 1);
    });

    it("should reject confidence values outside [0, 1]", () => {
      assert.throws(
        () => new Price(ethereum, eur, 3000, -0.1),
        /confidence/i
      );
      assert.throws(
        () => new Price(ethereum, eur, 3000, 1.1),
        /confidence/i
      );
    });
  });

  describe("to()", () => {
    it("should return a new price expressed in the conversion fiat currency", () => {
      const price1 = new Price(ethereum, eur, 4000);
      const price2 = price1.to(usd, 1.1);

      assert.notStrictEqual(price1, price2);
      assert.strictEqual(price2.crypto, ethereum);
      assert.strictEqual(price2.fiatCurrency, usd);
      assert.strictEqual(+price2.rate, 4000 * 1.1);
      assert.strictEqual(price2.confidence, price1.confidence);
    });

    it("should allow overriding the confidence on conversion", () => {
      const price1 = new Price(ethereum, eur, 4000, 0.9);
      const price2 = price1.to(usd, 1.1, 0.5);

      assert.strictEqual(price2.confidence, 0.5);
      assert.strictEqual(price2.crypto, price1.crypto);
      assert.strictEqual(price2.fiatCurrency, usd);
    });
  });

  describe("withConfidence()", () => {
    it("should clone the price with the provided confidence", () => {
      const price = new Price(ethereum, eur, 3000, 0.8);
      const updated = price.withConfidence(0.6);

      assert.notStrictEqual(price, updated);
      assert.strictEqual(updated.confidence, 0.6);
      assert.strictEqual(updated.crypto, price.crypto);
      assert.strictEqual(updated.fiatCurrency, price.fiatCurrency);
      assert.strictEqual(+updated.rate, +price.rate);
    });
  });

  describe("toString()", () => {
    it("should return a string representation of the price", () => {
      const price = new Price(ethereum, eur, 3000);
      assert.strictEqual(price.toString(), `${ethereum}/EUR 3000`);
    });
  });
});
