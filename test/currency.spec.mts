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

describe("Amount", () => {
  it("should correctly initialize an Amount instance", () => {
    const value = BigNumber.from(1);
    const amount = new Amount(mockCurrency, value);

    assert.strictEqual(amount.currency, mockCurrency);
    assert.strictEqual(amount.value, value);
  });

  it("should return the correct string representation", () => {
    const value = BigNumber.from(1000);
    const amount = new Amount(mockCurrency, value);

    assert.strictEqual(amount.toString(), "1000 ETH");
  });
});

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
