import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import type { Oracle } from "../../../src/services/oracle.mjs";
import {
  CryptoRegistryNG,
  CryptoMetadata,
} from "../../../src/cryptoregistry.mjs";
import { DataSourceOracle } from "../../../src/services/oracles/datasourceoracle.mjs";
import { CompositeOracle } from "../../../src/services/oracles/compositeoracle.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";

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
        priceMap
      );

      assert.sameMembers(Array.from(priceMap.keys()), [usd, eur]);
      const usdPrice = priceMap.get(usd);
      const eurPrice = priceMap.get(eur);
      assert.exists(usdPrice);
      assert.exists(eurPrice);
      if (usdPrice && eurPrice) {
        assert.equal(+usdPrice.rate, 229.06669921453178);
        assert.equal(+eurPrice.rate, 217.91046376268642);
        assert.strictEqual(usdPrice.confidence, 0.85);
        assert.strictEqual(eurPrice.confidence, 0.85);
      }
    });
  });
});
