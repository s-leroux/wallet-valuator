import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeDataSource } from "../../support/datasource.fake.mjs";
import {
  CryptoMetadata,
  CryptoRegistryNG,
} from "../../../src/cryptoregistry.mjs";
import { DataSourceOracle } from "../../../src/services/oracles/datasourceoracle.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";

chai.use(chaiAsPromised);
const assert = chai.assert;

describe("DataSourceOracle", function () {
  const bitcoin = FakeCryptoAsset.bitcoin;
  const eur = FakeFiatCurrency.EUR;
  const usd = FakeFiatCurrency.USD;
  let oracle: DataSourceOracle<number>;
  let cryptoRegistry: CryptoRegistryNG;
  let cryptoMetadata: CryptoMetadata;

  beforeEach(() => {
    oracle = new DataSourceOracle(bitcoin, new FakeDataSource((v) => v), {
      [usd.code]: "USD",
      [eur.code]: "EUR",
    });
    cryptoRegistry = CryptoRegistryNG.create();
    cryptoMetadata = CryptoMetadata.create();
  });

  describe("constructor", () => {
    it("should instanciate from a data source", () => {});
  });
  describe("getPrice()", () => {
    it("should return the price in requested currency", async () => {
      const priceMap = new Map() as PriceMap;
      await oracle.getPrice(
        cryptoRegistry,
        cryptoMetadata,
        bitcoin,
        new Date("2024-12-04"),
        new Set([eur]),
        priceMap
      );
      const price = priceMap.get(eur);
      if (!price) {
        assert.fail(`price is ${price}`);
      } else {
        assert.equal(+price.rate, 93_966.82);
        assert.equal(price.fiatCurrency, eur);
        assert.equal(price.crypto, bitcoin);
      }
    });
  });
});
