import { assert } from "chai";

import { Amount, Currency } from "../src/currency.mjs";

describe("Currency", function () {
  const chain = "My chain";
  const address = "0xCurrencyAddress";
  const name = "MY-TEST_CURRENCY";
  const symbol = "MTC";
  const decimal = 6;

  it("can be created", function () {
    const currency = new Currency(chain, address, name, symbol, decimal);

    assert.equal(currency.chain, chain);
    assert.equal(currency.address, address);
    assert.equal(currency.name, name);
    assert.equal(currency.symbol, symbol);
    assert.equal(currency.decimal, decimal);
  });

  it("can create amount", function () {
    const currency = new Currency(chain, address, name, symbol, decimal);
    const amount = currency.fromBaseUnit("1234567890");

    assert.equal(amount.toString(), "1234.56789 MTC");
  });
});
