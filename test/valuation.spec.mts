import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

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
import { CompositeOracle } from "../src/services/oracles/compositeoracle.mjs";
import { MissingPriceError } from "../src/error.mjs";

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
      const fiatCurrency = FakeFiatCurrency.usd;
      const oracle = new FakeOracle();
      const snapshots = snapshotsFromMovements(movements);
      const valuations = await Promise.all(
        snapshots.map((snapshot) =>
          SnapshotValuation.createFromSnapshot(
            registry,
            oracle,
            fiatConverter,
            fiatCurrency,
            snapshot,
            null
          )
        )
      );

      // Check that total valuation is properly computed
      assert.strictEqual(
        valuations[0].totalValue.toString(),
        "199930.97669449622 USD"
      );
      assert.strictEqual(valuations[0].fiatCurrency, fiatCurrency);

      assert.strictEqual(
        valuations[1].totalValue.toString(),
        "104229.2128726388532087224934266 USD"
      );
      assert.strictEqual(valuations[1].fiatCurrency, fiatCurrency);

      assert.strictEqual(
        valuations[2].totalValue.toString(),
        "200062.3491026753532087224934266 USD"
      );
      assert.strictEqual(valuations[2].fiatCurrency, fiatCurrency);
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
        "189643.12842672764 EUR"
      );
      assert.strictEqual(
        valuation.snapshotValuations[1].totalValue.toString(),
        "99253.8313961634461160286655519 EUR"
      );
      assert.strictEqual(
        valuation.snapshotValuations[2].totalValue.toString(),
        "190508.8270422186461160286655519 EUR"
      );
    });
  });
});
