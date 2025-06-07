import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import type { Oracle } from "../../../src/services/oracle.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { DataSourceOracle } from "../../../src/services/oracles/datasourceoracle.mjs";
import { CompositeOracle } from "../../../src/services/oracles/compositeoracle.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";

describe("CompositeOracle", function () {
  const bitcoin = FakeCryptoAsset.bitcoin;
  const [eur, usd] = [FakeFiatCurrency.EUR, FakeFiatCurrency.USD];
  let oracle: Oracle;
  let registry: CryptoRegistry;

  beforeEach(async function () {
    const opt = { dateFormat: "YYYY-MM-DD 00:00:00 UTC" };
    // prettier-ignore
    oracle = new CompositeOracle([
      await DataSourceOracle.createFromPath(bitcoin,"fixtures/sol-eur-max.csv", {[eur.code]: "price"}, opt),
      await DataSourceOracle.createFromPath(bitcoin,"fixtures/sol-usd-max.csv", {[usd.code]: "price"}, opt),
    ]);
    registry = CryptoRegistry.create();
  });

  describe("getPrice()", () => {
    it("should aggregate the results from several oracles", async function () {
      const priceMap = new Map() as PriceMap;
      await oracle.getPrice(
        registry,
        bitcoin,
        new Date("2024-12-05"),
        [usd, eur],
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
      }
    });
  });
});
