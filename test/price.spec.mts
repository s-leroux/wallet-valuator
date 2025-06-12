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
    });
  });

  describe("toString()", () => {
    it("should return a string representation of the price", () => {
      const price = new Price(ethereum, eur, 3000);
      assert.strictEqual(price.toString(), `${ethereum}/EUR 3000`);
    });
  });
});
