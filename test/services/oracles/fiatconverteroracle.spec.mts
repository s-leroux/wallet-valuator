import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { FakeOracle } from "../../support/oracle.fake.mjs";
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import { FixedFiatConverter } from "../../support/fiatconverter.fake.mjs";
import type { Oracle } from "../../../src/services/oracle.mjs";
import type { Price } from "../../../src/price.mjs";
import type { CryptoAsset } from "../../../src/cryptoasset.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import type { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import { DataSourceOracle } from "../../../src/services/oracles/datasourceoracle.mjs";
import { FiatConverterOracle } from "../../../src/services/oracles/fiatconverteroracle.mjs";

const EPSILON = 1e-12;

describe("FiatConverterOracle", function () {
  const date = new Date("2024-12-30");
  const solana = FakeCryptoAsset.solana;
  const bitcoin = FakeCryptoAsset.bitcoin;
  const [eur, usd] = [FakeFiatCurrency.eur, FakeFiatCurrency.usd];
  const factory = function (oracle: Oracle) {
    return new FixedFiatConverter(eur, usd, 1.2);
  };
  let oracle: Oracle;
  let registry: CryptoRegistry;

  beforeEach(async function () {
    const opt = { dateFormat: "YYYY-MM-DD 00:00:00 UTC" };
    // prettier-ignore
    oracle = new FiatConverterOracle (
      await DataSourceOracle.createFromPath(solana,"fixtures/sol-eur-max.csv", {[eur]: "price"}, opt),
      factory,
      bitcoin,
      eur)
    registry = CryptoRegistry.create();
  });

  describe("getPrice()", () => {
    it("should use the fiat converter to provide missing prices", async function () {
      const prices = await oracle.getPrice(
        registry,
        solana,
        new Date("2024-12-05"),
        [usd, eur]
      );

      assert.containsAllKeys(prices, [eur, usd]);
      assert.closeTo(+prices[eur].rate, 217.91046376268642, EPSILON);
      assert.closeTo(+prices[usd].rate, 217.91046376268642 * 1.2, EPSILON);
    });
  });
});
