import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeDataSource } from "../../support/datasource.fake.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";

import { DataSourceOracle } from "../../../src/services/oracles/datasourceoracle.mjs";

chai.use(chaiAsPromised);
const assert = chai.assert;

describe("DataSource", function () {
  const bitcoin = FakeCryptoAsset.bitcoin;
  const eur = FakeFiatCurrency.eur;
  const usd = FakeFiatCurrency.usd;
  let oracle: DataSourceOracle<number>;
  let registry: CryptoRegistry;

  beforeEach(() => {
    oracle = new DataSourceOracle(bitcoin, new FakeDataSource((v) => v), {
      [usd]: "USD",
      [eur]: "EUR",
    });
    registry = CryptoRegistry.create();
  });

  describe("constructor", () => {
    it("should instanciate from a data source", () => {});
  });
  describe("getPrice()", () => {
    it("should return the price in requested currency", async () => {
      const prices = await oracle.getPrice(
        registry,
        bitcoin,
        new Date("2024-12-04"),
        [eur]
      );
      const price = prices[eur];
      assert.equal(price.rate, 93_966.82);
      assert.equal(price.fiatCurrency, eur);
      assert.equal(price.crypto, bitcoin);
    });
  });
});
