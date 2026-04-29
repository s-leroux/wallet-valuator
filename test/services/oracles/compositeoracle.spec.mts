import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import { Oracle } from "../../../src/services/oracle.mjs";
import {
  CryptoRegistryNG,
  CryptoMetadata,
} from "../../../src/cryptoregistry.mjs";
import { DataSourceOracle } from "../../../src/services/oracles/datasourceoracle.mjs";
import { CompositeOracle } from "../../../src/services/oracles/compositeoracle.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";
import { CryptoAsset } from "../../../src/cryptoasset.mjs";
import { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import { Price } from "../../../src/price.mjs";

/**
 * Function signature for the filtering Oracle helper.
 *
 * It is expected to return the neww price to replace the original one, or null to remove the price from the result.
 */
type FilteringOracleFn = (
  crypto: CryptoAsset,
  date: Date,
  fiat: FiatCurrency,
  price: Price,
) => Price | null;

/**
 * An helper-class to filter ("transform") the prices returned by another existing Oracle.
 * This is useful to generate alternate results from the same data source.
 *
 * Testing purpose only. Do not use in production.
 */
class FilteringOracle extends Oracle {
  constructor(
    private readonly oracle: Oracle,
    private readonly fn: FilteringOracleFn,
  ) {
    super();
  }
  async getPrice(
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    crypto: CryptoAsset,
    date: Date,
    fiat: Set<FiatCurrency>,
    priceMap: PriceMap,
  ): Promise<void> {
    await this.oracle.getPrice(
      cryptoRegistry,
      cryptoMetadata,
      crypto,
      date,
      fiat,
      priceMap,
    );

    priceMap.forEach((price, fiat) => {
      const filteredPrice = this.fn(crypto, date, fiat, price);
      if (filteredPrice) {
        priceMap.set(fiat, filteredPrice);
      } else {
        priceMap.delete(fiat);
      }
    });
  }
}

describe("FilteringOracle", function () {
  const bitcoin = FakeCryptoAsset.bitcoin;
  const eur = FakeFiatCurrency.EUR;
  let cryptoRegistry: CryptoRegistryNG;
  let cryptoMetadata: CryptoMetadata;

  beforeEach(function () {
    cryptoRegistry = CryptoRegistryNG.create();
    cryptoMetadata = CryptoMetadata.create();
  });

  it("should transform prices with the provided function", async function () {
    const opt = { dateFormat: "YYYY-MM-DD 00:00:00 UTC" };
    const baseOracle = await DataSourceOracle.createFromPath(
      bitcoin,
      "fixtures/sol-eur-max.csv",
      { [eur.code]: "price" },
      opt,
    );
    const oracle = new FilteringOracle(
      baseOracle,
      (crypto, _date, fiat, price) =>
        crypto.price(fiat, price.rate.plus({ value: 1n, scale: 0n })),
    );

    const priceMap = new Map() as PriceMap;
    await oracle.getPrice(
      cryptoRegistry,
      cryptoMetadata,
      bitcoin,
      new Date("2024-12-05"),
      new Set([eur]),
      priceMap,
    );

    const transformed = priceMap.get(eur);
    assert.exists(transformed);
    if (transformed) {
      assert.equal(+transformed.rate, 218.91046376268642);
    }
  });

  it("should discard prices when the filter returns null", async function () {
    const opt = { dateFormat: "YYYY-MM-DD 00:00:00 UTC" };
    const baseOracle = await DataSourceOracle.createFromPath(
      bitcoin,
      "fixtures/sol-eur-max.csv",
      { [eur.code]: "price" },
      opt,
    );
    const filteredDate = "2024-12-05";
    const oracle = new FilteringOracle(
      baseOracle,
      (_crypto, date, _fiat, price) =>
        date.toISOString().startsWith(filteredDate) ? null : price,
    );

    const priceMap = new Map() as PriceMap;
    await oracle.getPrice(
      cryptoRegistry,
      cryptoMetadata,
      bitcoin,
      new Date(filteredDate),
      new Set([eur]),
      priceMap,
    );

    assert.equal(priceMap.has(eur), false);
  });
});

describe("CompositeOracle", function () {
  const bitcoin = FakeCryptoAsset.bitcoin;
  const [eur, usd] = [FakeFiatCurrency.EUR, FakeFiatCurrency.USD];
  let oracle: Oracle;
  let cryptoRegistry: CryptoRegistryNG;
  let cryptoMetadata: CryptoMetadata;

  beforeEach(async function () {
    const opt = { dateFormat: "YYYY-MM-DD 00:00:00 UTC" };
    // prettier-ignore
    oracle = new CompositeOracle([
      await DataSourceOracle.createFromPath(bitcoin,"fixtures/sol-eur-max.csv", {[eur.code]: "price"}, opt),
      await DataSourceOracle.createFromPath(bitcoin,"fixtures/sol-usd-max.csv", {[usd.code]: "price"}, opt),
    ]);
    cryptoRegistry = CryptoRegistryNG.create();
    cryptoMetadata = CryptoMetadata.create();
  });

  describe("getPrice()", () => {
    it("should aggregate the results from several oracles", async function () {
      const priceMap = new Map() as PriceMap;
      await oracle.getPrice(
        cryptoRegistry,
        cryptoMetadata,
        bitcoin,
        new Date("2024-12-05"),
        new Set([usd, eur]),
        priceMap,
      );

      assert.sameMembers(Array.from(priceMap.keys()), [usd, eur]);
      const usdPrice = priceMap.get(usd);
      const eurPrice = priceMap.get(eur);
      assert.exists(usdPrice);
      assert.exists(eurPrice);
      if (usdPrice && eurPrice) {
        assert.equal(+usdPrice.rate, 229.06669921453178);
        assert.equal(+eurPrice.rate, 217.91046376268642);
      }
    });

    it("should keep only the first price", async function () {
      const opt = { dateFormat: "YYYY-MM-DD 00:00:00 UTC" };
      const dsOracle = await DataSourceOracle.createFromPath(
        bitcoin,
        "fixtures/sol-eur-max.csv",
        { [eur.code]: "price" },
        opt,
      );

      oracle = new CompositeOracle([
        new FilteringOracle(dsOracle, (crypto, date, fiat, price) => {
          const shouldDrop = date.toISOString().startsWith("2024-12-05");
          return shouldDrop
            ? null
            : crypto.price(fiat, price.rate.plus({ value: 1n, scale: 0n }));
        }),
        dsOracle,
      ]);

      // prettier-ignore
      const testCases = [
        ["2024-12-04", 224.59591590054498],
        ["2024-12-05", 217.91046376268642],
        ["2024-12-06", 225.187375969035],
      ] as const;

      for (const [date, expected] of testCases) {
        const priceMap = new Map() as PriceMap;
        await oracle.getPrice(
          cryptoRegistry,
          cryptoMetadata,
          bitcoin,
          new Date(date),
          new Set([usd, eur]),
          priceMap,
        );

        assert.equal(priceMap.size, 1, `date: ${date}`);
        assert.equal(+priceMap.get(eur)!.rate, expected, `date: ${date}`);
      }
    });
  });
});
