import { assert } from "chai";

import { Amount, CryptoAsset } from "../src/cryptoasset.mjs";
import { BigNumber } from "../src/bignumber.mjs";

const mockCrypto = {
  name: "Ether",
  symbol: "ETH",
  decimal: 18,
};

describe("CryptoAsset", () => {
  it("should correctly initialize a CryptoAsset instance", () => {
    const crypto = new CryptoAsset(
      mockCrypto.name,
      mockCrypto.symbol,
      mockCrypto.decimal
    );

    assert.strictEqual(crypto.name, mockCrypto.name);
    assert.strictEqual(crypto.symbol, mockCrypto.symbol);
    assert.strictEqual(crypto.decimal, mockCrypto.decimal);
  });

  it("should convert base unit value to Amount in display unit", () => {
    const crypto = new CryptoAsset(
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
