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
import { CryptoMetadata, CryptoRegistryNG } from "../src/cryptoregistry.mjs";
import { FiatCurrency } from "../src/fiatcurrency.mjs";
import { registerRuntimePinnedBuildTest } from "./support/runtime-pinned-build.helper.mjs";
import { prepare } from "./support/register.helper.mjs";
import { InconsistentUnitsError } from "../src/error.mjs";
import { NullFiatConverter } from "../src/services/fiatconverter.mjs";
import { PriceResolver } from "../src/priceresolver.mjs";
import { Fixed } from "../src/bignumber.mjs";

describe("Value", () => {
  const { EUR, USD } = FakeFiatCurrency;
  registerRuntimePinnedBuildTest(import.meta.url);

  function make(unit: FiatCurrency, value: bigint | string) {
    return Value.from(unit, value);
  }

  describe("plus() method", () => {
    it("should return the sum of two quantities", () => {
      const a = make(EUR, 8n);
      const b = make(EUR, 2n);
      const c = make(EUR, 10n);
      assert.strictEqual(a.plus(b).value.equals(c.value), true);
    });

    it("should throw if units are inconsistent on plus", () => {
      const x = make(EUR, 1n);
      const y = make(USD, 1n);
      assert.throws(() => x.plus(y), InconsistentUnitsError);
    });
  });

  describe("minus() method", () => {
    it("should return the difference between two quantities", () => {
      const a = make(EUR, 8n);
      const b = make(EUR, 2n);
      const c = make(EUR, 6n);
      assert.strictEqual(a.minus(b).value.equals(c.value), true);
    });

    it("should throw if units are inconsistent on minus", () => {
      const x = make(EUR, 1n);
      const y = make(USD, 1n);
      assert.throws(() => x.minus(y), InconsistentUnitsError);
    });
  });

  describe("scaledBy() method", function () {
    const register = prepare(this);
    const testCases: [string, string, string][] = [
      ["8", "10", "80"],
      ["8.00", "10", "80.00"],
      ["8.00", "10.0", "80.00"],
      ["8.0", "10.00", "80.0"],
      ["8.00", "2.000", "16.00"],
      ["8.00", "2.00", "16.00"],
      ["8.00", "2.0", "16.00"],
      ["8.00", "2", "16.00"],
    ];

    for (const [value, factor, expected] of testCases) {
      register(`${value} * ${factor} => ${expected}`, () => {
        const a = Value.from(EUR, Fixed.fromString(value));
        assert.strictEqual(
          a.scaledBy(Fixed.fromString(factor)).value.toFixed(),
          expected,
          `${value}*${factor}`,
        );
      });
    }
  });

  describe("relativeTo() method", function () {
    const register = prepare(this);
    const testCases: [string, string, string][] = [
      ["8", "16", "0"],
      ["8.00", "16.000", "0.50"],
      ["8.00", "16.00", "0.50"],
      ["8.00", "16.0", "0.50"],
      ["8.00", "16", "0.50"],
      ["8.0", "16.00", "0.5"],
    ];

    for (const [numerator, denominator, expected] of testCases) {
      register(`${numerator} / ${denominator} => ${expected}`, () => {
        const a = Value.from(EUR, Fixed.fromString(numerator));
        const b = Value.from(EUR, Fixed.fromString(denominator));
        assert.strictEqual(
          a.relativeTo(b).toFixed(),
          expected,
          `${numerator}/${denominator}`,
        );
      });
    }
  });

  describe("quantity invariants", () => {
    it("should respect plus/minus identity", () => {
      const x = make(EUR, 8n);
      const y = make(EUR, 2n);
      const z = x.plus(y).minus(y);
      assert.strictEqual(z.value.equals(x.value), true);
    });

    it("should respect negation", () => {
      const x = make(EUR, 10n);
      const zero = x.plus(x.negated());
      assert.strictEqual(zero.isZero(), true, "x + (-x) should be zero");
    });
  });
});

describe("SnapshotValuation", () => {
  const fiatConverter = new NullFiatConverter();

  describe("valueFromAmountAndRate()", () => {
    const bitcoin = FakeCryptoAsset.bitcoin;
    const amount = bitcoin.amountFromString("100.5");
    const { EUR } = FakeFiatCurrency;
    const price = bitcoin.price(EUR, 100000n);

    it("should create a Value instance from amount and rate", () => {
      const value = amount.valueAt(price, 0n);
      assert.strictEqual(value.toString(), "10050000 EUR");
    });

    it("should check if the amount and rate are consistent", () => {
      assert.throws(() => {
        const price = FakeCryptoAsset.ethereum.price(EUR, "5000");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const value = amount.valueAt(price, 0n);
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
      const cryptoRegistry = CryptoRegistryNG.create();
      const cryptoMetadata: CryptoMetadata = CryptoMetadata.create();
      const fiatCurrency = FakeFiatCurrency.USD;
      const oracle = new FakeOracle();
      const priceResolver = new PriceResolver(oracle, fiatConverter);
      const snapshots = snapshotsFromMovements(movements);
      const valuations = await Promise.all(
        snapshots.map((snapshot) =>
          SnapshotValuation.createFromSnapshot(
            cryptoRegistry,
            cryptoMetadata,
            priceResolver,
            fiatCurrency,
            snapshot,
            null,
          ),
        ),
      );

      // Check that total valuation is properly computed
      assert.strictEqual(
        valuations[0].cryptoValueAfter.totalCryptoValue.toString(),
        "199930.9766944962200000 USD",
      );
      assert.strictEqual(valuations[0].fiatCurrency, fiatCurrency);

      assert.strictEqual(
        valuations[1].cryptoValueAfter.totalCryptoValue.toString(),
        "104229.21287263885320872249342660 USD",
      );
      assert.strictEqual(valuations[1].fiatCurrency, fiatCurrency);

      assert.strictEqual(
        valuations[2].cryptoValueAfter.totalCryptoValue.toString(),
        "200062.34910267535320872249342660 USD",
      );
      assert.strictEqual(valuations[2].fiatCurrency, fiatCurrency);
    });
  });
});

describe("PortfolioValuation", () => {
  const fiatConverter = new NullFiatConverter();

  describe("create()", () => {
    const cryptoRegistry: CryptoRegistryNG = CryptoRegistryNG.create();
    const cryptoMetadata: CryptoMetadata = CryptoMetadata.create();
    const oracle = FakeOracle.create();
    const fiat = FakeFiatCurrency.EUR;
    // const timeStamp = new Date("2024-12-30").getTime() / 1000;

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
        cryptoRegistry,
        cryptoMetadata,
        oracle,
        fiatConverter,
        fiat,
        snapshots,
      );

      assert.strictEqual(valuation.snapshotValuations.length, 3);
      assert.strictEqual(
        valuation.snapshotValuations[0].cryptoValueAfter.totalCryptoValue.toString(),
        "189643.1284267276400000 EUR",
      );
      assert.strictEqual(
        valuation.snapshotValuations[1].cryptoValueAfter.totalCryptoValue.toString(),
        "99253.83139616344611602866555190 EUR",
      );
      assert.strictEqual(
        valuation.snapshotValuations[2].cryptoValueAfter.totalCryptoValue.toString(),
        "190508.82704221864611602866555190 EUR",
      );
    });
  });
});
