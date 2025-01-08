import { assert } from "chai";

import { NotImplementedError } from "../src/error.mjs";
import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "./support/fiatcurrency.fake.mjs";
import { FakeOracle } from "./support/oracle.fake.mjs";
import {
  Valuation,
  Value,
  valueFromAmountAndPrice,
} from "../src/valuation.mjs";

describe("Valuation", () => {
  describe("valueFromAmountAndRate()", () => {
    const bitcoin = FakeCryptoAsset.bitcoin;
    const amount = bitcoin.fromString("100.5");
    const fiat = FakeFiatCurrency.eur;
    const price = bitcoin.price(fiat, 100000);

    it("should create a Value instance from amount and rate", () => {
      const value = valueFromAmountAndPrice(amount, price);
      assert.strictEqual(value.toString(), "10050000 EUR");
    });

    it("should check if the amount and rate are consistent", () => {
      assert.throws(() => {
        const price = FakeCryptoAsset.ethereum.price(fiat, 5000);
        const value = valueFromAmountAndPrice(amount, price);
      });
    });
  });

  describe("create()", () => {
    const oracle = FakeOracle.create();
    const fiat = FakeFiatCurrency.eur;
    const timeStamp = new Date("2024-12-30").getTime() / 1000;
    const amounts = [
      FakeCryptoAsset.bitcoin.fromString("0.001"),
      FakeCryptoAsset.ethereum.fromString("5"),
    ];

    it("should create a Valuation instance from holdings", async () => {
      const valuation = await Valuation.create(
        oracle,
        fiat,
        timeStamp,
        amounts
      );

      assert.strictEqual(valuation.fiatCurrency, fiat);
      assert.strictEqual(valuation.timeStamp, timeStamp);
      assert.strictEqual(valuation.timeStamp, timeStamp);
      assert.strictEqual(
        valuation.get(FakeCryptoAsset.bitcoin).toString(),
        "89.80900932731242 EUR"
      );
      assert.strictEqual(
        valuation.get(FakeCryptoAsset.ethereum).toString(),
        "16095.84934118351 EUR"
      );
      assert.strictEqual(
        valuation.get(FakeCryptoAsset.solana).toString(),
        "0 EUR"
      );
      assert.strictEqual(
        valuation.totalValue.toString(),
        "16185.65835051082242"
      );
    });
  });
});
