import { assert } from "chai";

import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "./support/fiatcurrency.fake.mjs";
import { Amount, CryptoAsset } from "../src/cryptoasset.mjs";
import { Price } from "../src/price.mjs";
import { BigNumber } from "../src/bignumber.mjs";

const mockCrypto = FakeCryptoAsset.ethereum;

describe("CryptoAsset", () => {
  it("should correctly initialize a CryptoAsset instance", () => {
    const crypto = new CryptoAsset(
      mockCrypto.id,
      mockCrypto.name,
      mockCrypto.symbol,
      mockCrypto.decimal
    );

    assert.strictEqual(crypto.id, mockCrypto.id);
    assert.strictEqual(crypto.name, mockCrypto.name);
    assert.strictEqual(crypto.symbol, mockCrypto.symbol);
    assert.strictEqual(crypto.decimal, mockCrypto.decimal);
  });

  it("should convert base unit value to Amount in display unit", () => {
    const crypto = new CryptoAsset(
      mockCrypto.id,
      mockCrypto.name,
      mockCrypto.symbol,
      mockCrypto.decimal
    );
    const baseUnitValue = "12345678900000000000";
    //                     09876543210987654321
    const amount = crypto.fromBaseUnit(baseUnitValue);

    assert.strictEqual(amount.crypto, crypto);
    assert.strictEqual(
      amount.value.toString(),
      "12.3456789",
      "Amount value should equal 12.3456789"
    );
  });

  it("should create an Amount from a string", () => {
    const crypto = FakeCryptoAsset.bitcoin;
    const amount = crypto.fromString("100.5");

    assert.strictEqual(amount.toString(), "100.5 BTC");
  });

  it("should create a Price instance from fiat and rate", () => {
    const crypto = FakeCryptoAsset.bitcoin;
    const amount = crypto.fromString("100.5");
    const fiat = FakeFiatCurrency.eur;
    const price = crypto.price(fiat, 100000);

    assert.strictEqual(price.rate, 100000);
    assert.strictEqual(price.crypto, crypto);
    assert.strictEqual(price.fiatCurrency, fiat);
  });
});

describe("Amount", () => {
  describe("constructor", () => {
    it("should correctly initialize an Amount instance", () => {
      const value = BigNumber.from(1);
      const amount = new Amount(mockCrypto, value);

      assert.strictEqual(amount.crypto, mockCrypto);
      assert.strictEqual(amount.value, value);
    });
  });

  describe("toString() method", () => {
    it("should return the correct string representation for the object", () => {
      const value = BigNumber.from(1000);
      const amount = new Amount(mockCrypto, value);

      assert.strictEqual(amount.toString(), "1000 ETH");
    });
  });

  describe("plus() method", () => {
    it("should return the sum of two amounts", () => {
      const va = BigNumber.from(1000);
      const vb = BigNumber.from(3.5);
      const a = new Amount(mockCrypto, va);
      const b = new Amount(mockCrypto, vb);

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
      const a = new Amount(mockCrypto, va);
      const b = new Amount(mockCrypto, vb);

      assert.strictEqual(a.minus(b).value.toString(), va.minus(vb).toString());
      // leave the arguments inchanged:
      assert.strictEqual(a.value.toString(), va.toString());
      assert.strictEqual(b.value.toString(), vb.toString());
    });
  });
});
