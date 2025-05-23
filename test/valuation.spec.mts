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
import {
  PortfolioValuation,
  SnapshotValuation,
  Value,
} from "../src/valuation.mjs";
import { CryptoRegistry } from "../src/cryptoregistry.mjs";
import { FiatCurrency } from "../src/fiatcurrency.mjs";
import { testQuantityInterface } from "./support/quantity.helper.mjs";
import { BigNumber } from "../src/bignumber.mjs";
import { NullFiatConverter } from "../src/services/fiatconverter.mjs";

describe("Value", () => {
  const { EUR, USD } = FakeFiatCurrency;

  testQuantityInterface<FiatCurrency, Value>(
    {
      make(unit, value) {
        return new Value(unit, BigNumber.from(value));
      },
      unitEquals(a, b) {
        return a.fiatCurrency == b.fiatCurrency;
      },
    },
    EUR,
    USD
  );
});

describe("SnapshotValuation", () => {
  const fiatConverter = new NullFiatConverter();

  describe("valueFromAmountAndRate()", () => {
    const bitcoin = FakeCryptoAsset.bitcoin;
    const amount = bitcoin.amountFromString("100.5");
    const fiat = FakeFiatCurrency.EUR;
    const price = bitcoin.price(fiat, 100000);

    it("should create a Value instance from amount and rate", () => {
      const value = amount.valueAt(price);
      assert.strictEqual(value.toString(), "10050000 EUR");
    });

    it("should check if the amount and rate are consistent", () => {
      assert.throws(() => {
        const price = FakeCryptoAsset.ethereum.price(fiat, 5000);
        const value = amount.valueAt(price);
      });
    });
  });

  describe("from Snapshot", () => {
    const INGRESS = [true, false] as const;
    const EGRESS = [false, true] as const;

    const movements = [
      FakeMovement(...INGRESS, "2024-12-02", "200000", "usd-coin"),
      FakeMovement(...EGRESS, "2024-12-03", "95833.1362300365", "usd-coin"),
      FakeMovement(...INGRESS, "2024-12-03", "1", "bitcoin"),
    ];

    it("should create a Valuation instance from holdings", async () => {
      const registry = CryptoRegistry.create();
      const fiatCurrency = FakeFiatCurrency.USD;
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
        valuations[0].cryptoValueAfter.totalCryptoValue.toString(),
        "199930.97669449622 USD"
      );
      assert.strictEqual(valuations[0].fiatCurrency, fiatCurrency);

      assert.strictEqual(
        valuations[1].cryptoValueAfter.totalCryptoValue.toString(),
        "104229.2128726388532087224934266 USD"
      );
      assert.strictEqual(valuations[1].fiatCurrency, fiatCurrency);

      assert.strictEqual(
        valuations[2].cryptoValueAfter.totalCryptoValue.toString(),
        "200062.3491026753532087224934266 USD"
      );
      assert.strictEqual(valuations[2].fiatCurrency, fiatCurrency);
    });
  });
});

describe("PortfolioValuation", () => {
  const fiatConverter = new NullFiatConverter();

  describe("create()", () => {
    const registry = CryptoRegistry.create();
    const oracle = FakeOracle.create();
    const fiat = FakeFiatCurrency.EUR;
    const timeStamp = new Date("2024-12-30").getTime() / 1000;
    const amounts = [
      FakeCryptoAsset.bitcoin.amountFromString("0.001"),
      FakeCryptoAsset.ethereum.amountFromString("5"),
    ];

    it("should create a PortfolioValuation instance from snapshots", async () => {
      const INGRESS = [true, false] as const;
      const EGRESS = [false, true] as const;

      const movements = [
        FakeMovement(...INGRESS, "2024-12-02", "200000", "usd-coin"),
        FakeMovement(...EGRESS, "2024-12-03", "95833.1362300365", "usd-coin"),
        FakeMovement(...INGRESS, "2024-12-03", "1", "bitcoin"),
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
        valuation.snapshotValuations[0].cryptoValueAfter.totalCryptoValue.toString(),
        "189643.12842672764 EUR"
      );
      assert.strictEqual(
        valuation.snapshotValuations[1].cryptoValueAfter.totalCryptoValue.toString(),
        "99253.8313961634461160286655519 EUR"
      );
      assert.strictEqual(
        valuation.snapshotValuations[2].cryptoValueAfter.totalCryptoValue.toString(),
        "190508.8270422186461160286655519 EUR"
      );
    });
  });
});
