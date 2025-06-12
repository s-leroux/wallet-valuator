import { assert } from "chai";

import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "./support/fiatcurrency.fake.mjs";
import { Amount, CryptoAsset, CryptoAssetID } from "../src/cryptoasset.mjs";
import { BigNumber } from "../src/bignumber.mjs";

import { ValueError } from "../src/error.mjs";
import { testQuantityInterface } from "./support/quantity.helper.mjs";
import { InstanceCache } from "../src/instancecache.mjs";

const { ethereum, bitcoin } = FakeCryptoAsset;

describe("CryptoAsset", () => {
  let cache: InstanceCache<CryptoAssetID, CryptoAsset>;

  beforeEach(() => {
    cache = new InstanceCache();
  });

  it("should correctly initialize a CryptoAsset instance", () => {
    const crypto = CryptoAsset.create(
      cache,
      ethereum.id,
      ethereum.name,
      ethereum.symbol,
      ethereum.decimal
    );

    assert.strictEqual(crypto.id, ethereum.id);
    assert.strictEqual(crypto.name, ethereum.name);
    assert.strictEqual(crypto.symbol, ethereum.symbol);
    assert.strictEqual(crypto.decimal, ethereum.decimal);
  });

  it("should convert base unit value to Amount in display unit", () => {
    const crypto = CryptoAsset.create(
      cache,
      ethereum.id,
      ethereum.name,
      ethereum.symbol,
      ethereum.decimal
    );
    const baseUnitValue = "12345678900000000000";
    //                     09876543210987654321
    const amount = crypto.amountFromBaseUnit(baseUnitValue);

    assert.strictEqual(amount.crypto, crypto);
    assert.strictEqual(
      amount.value.toString(),
      "12.3456789",
      "Amount value should equal 12.3456789"
    );
  });

  it("should create an Amount from a string", () => {
    const crypto = FakeCryptoAsset.bitcoin;
    const amount = crypto.amountFromString("100.5");

    assert.strictEqual(amount.toString(), "100.5 BTC");
  });

  it("should create a Price instance from fiat and rate", () => {
    const crypto = FakeCryptoAsset.bitcoin;
    const amount = crypto.amountFromString("100.5"); // ISSUE #133 Why that statement? Did we forget to test something?
    const fiat = FakeFiatCurrency.EUR;
    const price = crypto.price(fiat, 100000);

    assert.strictEqual(+price.rate, 100000);
    assert.strictEqual(price.crypto, crypto);
    assert.strictEqual(price.fiatCurrency, fiat);
  });
});

describe("Amount", () => {
  describe("constructor", () => {
    it("should correctly initialize an Amount instance", () => {
      const value = BigNumber.from(1);
      const amount = new Amount(ethereum, value);

      assert.strictEqual(amount.crypto, ethereum);
      assert.strictEqual(amount.value, value);
    });
  });

  it("should allow zero", function () {
    const amount = new Amount(ethereum, new BigNumber("0"));
    assert.strictEqual(amount.value.toString(), "0");
  });

  it("should default to zero when value is undefined", function () {
    const amount = new Amount(ethereum);
    assert.strictEqual(amount.value.toString(), "0");
  });

  it("should normalize -0 to +0", function () {
    const amount = new Amount(ethereum, new BigNumber("-0"));
    assert.strictEqual(amount.value.toString(), "0"); // Ensures normalization
  });

  it("should handle very large positive values", function () {
    const amount = new Amount(ethereum, new BigNumber("1e50"));
    assert.strictEqual(
      amount.value.toString(),
      "100000000000000000000000000000000000000000000000000"
    );
  });

  it("should allow negative values", function () {
    const amount = new Amount(ethereum, new BigNumber("-1.50"));
    assert.strictEqual(amount.value.toString(), "-1.5");
  });

  it("should reject NaN values", function () {
    assert.throws(() => new Amount(ethereum, new BigNumber(NaN)), ValueError);
  });

  describe("toString() method", () => {
    it("should return the correct string representation for the object", () => {
      const value = BigNumber.from(1000);
      const amount = new Amount(ethereum, value);

      assert.strictEqual(amount.toString(), "1000 ETH");
    });
  });

  testQuantityInterface<CryptoAsset, Amount>(
    {
      make(unit, value) {
        return new Amount(unit, BigNumber.from(value));
      },
      unitEquals(a, b) {
        return a.crypto == b.crypto;
      },
    },
    ethereum,
    bitcoin
  );
});
