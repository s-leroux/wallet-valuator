import { assert } from "chai";

import { Amount, Currency } from "../src/currency.mjs";
import { BigNumber } from "../src/bignumber.mjs";

const mockCurrency = {
  chain: "Ethereum",
  address: "0x123456789abcdef",
  name: "Ether",
  symbol: "ETH",
  decimal: 18,
};

describe("Currency", () => {
  it("should correctly initialize a Currency instance", () => {
    const currency = new Currency(
      mockCurrency.chain,
      mockCurrency.address,
      mockCurrency.name,
      mockCurrency.symbol,
      mockCurrency.decimal
    );

    assert.strictEqual(currency.chain, mockCurrency.chain);
    assert.strictEqual(currency.address, mockCurrency.address);
    assert.strictEqual(currency.name, mockCurrency.name);
    assert.strictEqual(currency.symbol, mockCurrency.symbol);
    assert.strictEqual(currency.decimal, mockCurrency.decimal);
  });

  it("should convert base unit value to Amount in display unit", () => {
    const currency = new Currency(
      mockCurrency.chain,
      mockCurrency.address,
      mockCurrency.name,
      mockCurrency.symbol,
      mockCurrency.decimal
    );
    const baseUnitValue = "12345678900000000000";
    //                     09876543210987654321
    const amount = currency.fromBaseUnit(baseUnitValue);

    assert.strictEqual(amount.currency, currency);
    assert.strictEqual(
      amount.value.toString(),
      "12.3456789",
      "Amount value should equal 12.3456789"
    );
  });
});

describe("Amount", () => {
  describe("constructor", () => {
    it("should correctly initialize an Amount instance", () => {
      const value = BigNumber.from(1);
      const amount = new Amount(mockCurrency, value);

      assert.strictEqual(amount.currency, mockCurrency);
      assert.strictEqual(amount.value, value);
    });
  });

  describe("toString() method", () => {
    it("should return the correct string representation for the object", () => {
      const value = BigNumber.from(1000);
      const amount = new Amount(mockCurrency, value);

      assert.strictEqual(amount.toString(), "1000 ETH");
    });
  });

  describe("plus() method", () => {
    it("should return the sum of two amounts", () => {
      const va = BigNumber.from(1000);
      const vb = BigNumber.from(3.5);
      const a = new Amount(mockCurrency, va);
      const b = new Amount(mockCurrency, vb);

      assert.strictEqual(a.plus(b).value.toString(), va.plus(vb).toString());
      // leave the arguments inchanged:
      assert.strictEqual(a.value.toString(), va.toString());
      assert.strictEqual(b.value.toString(), vb.toString());
    });
  });

  describe("minus() method", () => {
    it("should return the difference between two amounts", () => {
      const va = BigNumber.from(1000);
      const vb = BigNumber.from(3.5);
      const a = new Amount(mockCurrency, va);
      const b = new Amount(mockCurrency, vb);

      assert.strictEqual(a.minus(b).value.toString(), va.minus(vb).toString());
      // leave the arguments inchanged:
      assert.strictEqual(a.value.toString(), va.toString());
      assert.strictEqual(b.value.toString(), vb.toString());
    });
  });
});
