import { assert } from "chai";

import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "./support/fiatcurrency.fake.mjs";
import { Amount, CryptoAsset, CryptoAssetID } from "../src/cryptoasset.mjs";
import { BigNumber, Fixed } from "../src/bignumber.mjs";

import { InconsistentUnitsError, ValueError } from "../src/error.mjs";
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
      ethereum.decimal,
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
      ethereum.decimal,
    );
    const baseUnitValue = "12345678900000000000";
    //                     09876543210987654321
    const amount = crypto.amountFromBaseUnit(baseUnitValue);

    assert.strictEqual(amount.crypto, crypto);
    assert.strictEqual(amount.value.toString(), "12.345678900000000000");
  });

  it("should create an Amount from a string", () => {
    const crypto = FakeCryptoAsset.bitcoin;
    const amount = crypto.amountFromString("100.5");

    assert.strictEqual(amount.toString(), "100.5 BTC");
  });

  it("should create a Price instance from fiat and rate", () => {
    const crypto = FakeCryptoAsset.bitcoin;
    // const amount = crypto.amountFromString("100.5"); // ISSUE #133 Why that statement? Did we forget to test something?
    const fiat = FakeFiatCurrency.EUR;
    const price = crypto.price(fiat, 100000);

    assert.strictEqual(price.rate.toFixed(), "100000");
    assert.strictEqual(price.crypto, crypto);
    assert.strictEqual(price.fiatCurrency, fiat);
  });
});

describe("Amount", () => {
  describe("constructor", () => {
    it("should correctly initialize an Amount instance", () => {
      const value = Fixed.fromInteger("1");
      const amount = new Amount(ethereum, value);

      assert.strictEqual(amount.crypto, ethereum);
      assert.strictEqual(amount.value.toString(), value.toString());
    });
  });

  it("should allow zero", function () {
    const amount = new Amount(ethereum, Fixed.fromString("0"));
    assert.strictEqual(amount.value.toString(), "0");
  });

  it("should default to zero when value is undefined", function () {
    const amount = new Amount(ethereum);
    assert.strictEqual(amount.value.toString(), "0");
  });

  it("should normalize -0 to +0", function () {
    const amount = new Amount(ethereum, Fixed.fromString("-0"));
    assert.strictEqual(amount.value.toString(), "0"); // Ensures normalization
  });

  it("should handle very large positive values", function () {
    const E50 = 10n ** 50n;
    const amount = new Amount(ethereum, Fixed.fromInteger(E50));
    assert.strictEqual(
      amount.value.toString(),
      "100000000000000000000000000000000000000000000000000",
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

  describe("negated() method", () => {
    it("should return a new Amount with the opposite sign", () => {
      const amount = new Amount(ethereum, Fixed.fromString("12.34"));
      const negated = amount.negated();

      assert.strictEqual(negated.crypto, ethereum);
      assert.strictEqual(negated.value.toString(), "-12.34");
      assert.strictEqual(amount.value.toString(), "12.34");
    });

    it("should keep zero unsigned when negated", () => {
      const zero = new Amount(ethereum, Fixed.fromString("0"));
      assert.isTrue(zero.isZero());

      const negatedZero = zero.negated();

      assert.isTrue(negatedZero.isZero());
      assert.strictEqual(negatedZero.value.toString(), "0");
      assert.strictEqual(negatedZero.toString(), "0 ETH");
    });
  });

  describe("isZero() method", () => {
    it("should return true for zero values", () => {
      const amount = new Amount(ethereum, Fixed.fromString("0"));
      assert.isTrue(amount.isZero());
    });

    it("should return false for non-zero values", () => {
      const amount = new Amount(ethereum, Fixed.fromString("0.0001"));
      assert.isFalse(amount.isZero());
    });
  });

  describe("relativeTo() method", () => {
    it("should round-trip with scaledBy for scale-compatible values", () => {
      const base = new Amount(ethereum, Fixed.fromString("16.00"));
      const target = new Amount(ethereum, Fixed.fromString("8.0"));

      const share = target.relativeTo(base);
      const rebuilt = base.scaledBy(share);

      assert.strictEqual(rebuilt.crypto, target.crypto);
      assert.isTrue(rebuilt.value.equals(target.value));
      assert.strictEqual(rebuilt.value.toFixed(), "8.00");
    });

    it("should return a ratio with deterministic scale (lhs.scale + rhs.scale)", () => {
      const lhs = new Amount(ethereum, Fixed.fromString("8.00"));
      const rhs = new Amount(ethereum, Fixed.fromString("16.0"));

      const ratio = lhs.relativeTo(rhs);

      assert.strictEqual(ratio.scale, 3n);
      assert.strictEqual(ratio.toFixed(), "0.500");
    });

    it("should throw when units are inconsistent", () => {
      const a = new Amount(ethereum, Fixed.fromString("1"));
      const b = new Amount(bitcoin, Fixed.fromString("1"));
      assert.throws(() => a.relativeTo(b), InconsistentUnitsError);
    });

    it("should throw on division by zero", () => {
      const a = new Amount(ethereum, Fixed.fromString("1"));
      const b = new Amount(ethereum, Fixed.fromString("0"));
      assert.throws(() => a.relativeTo(b), RangeError);
    });
  });

  describe("valueAt() method", () => {
    it("should use the default fixed-point multiplication scale when omitted", () => {
      const amount = ethereum.amountFromString("2.50");
      const price = ethereum.price(FakeFiatCurrency.EUR, "3.200");

      const value = amount.valueAt(price);

      assert.strictEqual(value.value.toFixed(), "8.00000");
    });
  });

  describe("toDisplayString() method", () => {
    it("should return formatted value with symbol", () => {
      const amount = ethereum.amountFromString("1.2300");

      assert.strictEqual(amount.toDisplayString({}), "1.2300 ETH");
    });
  });

  testQuantityInterface<CryptoAsset, Amount>(
    {
      make(unit, value) {
        return new Amount(unit, value);
      },
      unitEquals(a, b) {
        return a.crypto == b.crypto;
      },
    },
    ethereum,
    bitcoin,
  );
});
