import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { FakeOracle } from "../../support/oracle.fake.mjs";
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import type { Oracle } from "../../../src/services/oracle.mjs";
import { Caching } from "../../../src/services/oracles/caching.mjs";
import type { Price } from "../../../src/price.mjs";
import type { CryptoAsset } from "../../../src/cryptoasset.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import type { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import { DataSourceOracle } from "../../../src/services/oracles/datasourceoracle.mjs";
import { CompositeOracle } from "../../../src/services/oracles/compositeoracle.mjs";

describe("CompositeOracle", function () {
  const date = new Date("2024-12-30");
  const bitcoin = FakeCryptoAsset.bitcoin;
  const [eur, usd] = [FakeFiatCurrency.eur, FakeFiatCurrency.usd];
  let oracle: Oracle;
  let registry: CryptoRegistry;

  beforeEach(async function () {
    const opt = { dateFormat: "YYYY-MM-DD 00:00:00 UTC" };
    // prettier-ignore
    oracle = new CompositeOracle([
      await DataSourceOracle.createFromPath(bitcoin,"fixtures/sol-eur-max.csv", {[eur]: "price"}, opt),
      await DataSourceOracle.createFromPath(bitcoin,"fixtures/sol-usd-max.csv", {[usd]: "price"}, opt),
    ])
    registry = CryptoRegistry.create();
  });

  describe("getPrice()", () => {
    it("should aggregate the results from several oracles", async function () {
      const prices = await oracle.getPrice(
        registry,
        bitcoin,
        new Date("2024-12-05"),
        [usd, eur]
      );

      assert.containsAllKeys(prices, [eur, usd]);
      assert.equal(+prices[usd]!.rate, 229.06669921453178);
      assert.equal(+prices[eur]!.rate, 217.91046376268642);
    });
  });
});
