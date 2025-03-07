import { assert } from "chai";

import { NotImplementedError } from "../src/error.mjs";
import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import {
  FakeMovement,
  snapshotsFromMovements,
} from "./support/snapshot.fake.mjs";
import { FakeFiatCurrency } from "./support/fiatcurrency.fake.mjs";
import { FakeOracle } from "./support/oracle.fake.mjs";
import { FakeFiatConverter } from "./support/fiatconverter.fake.mjs";
import {
  PortfolioValuation,
  SnapshotValuation,
  Value,
  valueFromAmountAndPrice,
} from "../src/valuation.mjs";
import { CryptoRegistry } from "../src/cryptoregistry.mjs";

describe("SnapshotValuation", () => {
  const fiatConverter = new FakeFiatConverter();

  describe("valueFromAmountAndRate()", () => {
    const bitcoin = FakeCryptoAsset.bitcoin;
    const amount = bitcoin.amountFromString("100.5");
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
    const registry = CryptoRegistry.create();
    const oracle = FakeOracle.create();
    const fiat = FakeFiatCurrency.eur;
    const timeStamp = new Date("2024-12-30").getTime() / 1000;
    const amounts = [
      FakeCryptoAsset.bitcoin.amountFromString("0.001"),
      FakeCryptoAsset.ethereum.amountFromString("5"),
    ];

    it("should create a Valuation instance from holdings", async () => {
      const valuation = await SnapshotValuation.create(
        registry,
        oracle,
        fiatConverter,
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

  describe("from Snapshot", () => {
    const INGRESS = true;
    const EGRESS = false;

    const movements = [
      FakeMovement(INGRESS, "2024-12-02", "200000", "usd-coin"),
      FakeMovement(EGRESS, "2024-12-03", "95833.1362300365", "usd-coin"),
      FakeMovement(INGRESS, "2024-12-03", "1", "bitcoin"),
    ];

    it("should create a Valuation instance from holdings", async () => {
      const registry = CryptoRegistry.create();
      const fiat = FakeFiatCurrency.usd;
      const oracle = new FakeOracle();
      const snapshots = snapshotsFromMovements(movements);
      const valuations = await Promise.all(
        snapshots.map((snapshot) =>
          snapshot.evaluate(registry, oracle, fiatConverter, fiat)
        )
      );

      // Check that total valuation is properly computed
      assert.strictEqual(
        valuations[0].totalValue.toString(),
        "199930.97669449622"
      );
      assert.strictEqual(valuations[0].fiatCurrency, fiat);

      assert.strictEqual(
        valuations[1].totalValue.toString(),
        "104229.2128726388532087224934266"
      );
      assert.strictEqual(valuations[1].fiatCurrency, fiat);

      assert.strictEqual(
        valuations[2].totalValue.toString(),
        "200062.3491026753532087224934266"
      );
      assert.strictEqual(valuations[2].fiatCurrency, fiat);
    });
  });
});

describe("PortfolioValuation", () => {
  const fiatConverter = new FakeFiatConverter();

  describe("create()", () => {
    const registry = CryptoRegistry.create();
    const oracle = FakeOracle.create();
    const fiat = FakeFiatCurrency.eur;
    const timeStamp = new Date("2024-12-30").getTime() / 1000;
    const amounts = [
      FakeCryptoAsset.bitcoin.amountFromString("0.001"),
      FakeCryptoAsset.ethereum.amountFromString("5"),
    ];

    it("should create a PortfolioValuation instance from snapshots", async () => {
      const INGRESS = true;
      const EGRESS = false;

      const movements = [
        FakeMovement(INGRESS, "2024-12-02", "200000", "usd-coin"),
        FakeMovement(EGRESS, "2024-12-03", "95833.1362300365", "usd-coin"),
        FakeMovement(INGRESS, "2024-12-03", "1", "bitcoin"),
      ];
      const snapshots = snapshotsFromMovements(movements);
      const valuation = await PortfolioValuation.create(
        registry,
        oracle,
        fiatConverter,
        fiat,
        snapshots
      );

      assert.strictEqual(valuation.snapshotValuations.length, 3);
      assert.strictEqual(
        valuation.snapshotValuations[0].totalValue.toString(),
        "189643.12842672764"
      );
      assert.strictEqual(
        valuation.snapshotValuations[1].totalValue.toString(),
        "99253.8313961634461160286655519"
      );
      assert.strictEqual(
        valuation.snapshotValuations[2].totalValue.toString(),
        "190508.8270422186461160286655519"
      );
    });
  });
});
