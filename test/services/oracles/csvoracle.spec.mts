import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeDataSource } from "../../support/datasource.fake.mjs";
import { FakeFiatConverter } from "../../support/fiatconverter.fake.mjs";

import { CSVOracle } from "../../../src/services/oracles/csvoracle.mjs";

chai.use(chaiAsPromised);
const assert = chai.assert;

describe("DataSource", function () {
  const bitcoin = FakeCryptoAsset.bitcoin;
  const eur = FakeFiatCurrency.eur;
  const usd = FakeFiatCurrency.usd;
  let oracle: CSVOracle<number>;

  beforeEach(() => {
    oracle = new CSVOracle(bitcoin, new FakeDataSource((v) => v), {
      [usd]: "USD",
      [eur]: "EUR",
    });
  });

  describe("constructor", () => {
    it("should instanciate from a data source", () => {});
  });
  describe("getPrice()", () => {
    it("should return the price in requested currency", async () => {
      const prices = await oracle.getPrice(
        new FakeFiatConverter(),
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
