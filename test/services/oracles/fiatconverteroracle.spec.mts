import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import { FixedFiatConverter } from "../../support/fiatconverter.fake.mjs";
import type { Oracle } from "../../../src/services/oracle.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { DataSourceOracle } from "../../../src/services/oracles/datasourceoracle.mjs";
import { FiatConverter } from "../../../src/services/fiatconverter.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";

const EPSILON = 1e-12;

describe("FiatConverterOracle", function () {
  const solana = FakeCryptoAsset.solana;
  const { EUR: eur, USD: usd } = FakeFiatCurrency;

  let oracle: Oracle;
  let registry: CryptoRegistry;
  let fiatConverter: FiatConverter;

  beforeEach(async function () {
    const opt = { dateFormat: "YYYY-MM-DD 00:00:00 UTC" };
    // prettier-ignore
    oracle = await DataSourceOracle.createFromPath(solana,"fixtures/sol-eur-max.csv", {[eur]: "price"}, opt);
    registry = CryptoRegistry.create();
    fiatConverter = new FixedFiatConverter(eur, usd, 1.2);
  });

  describe("getPrice()", () => {
    it("should use the fiat converter to provide missing prices", async function () {
      const date = new Date("2024-12-05");
      const priceMap = new Map() as PriceMap;
      await oracle.getPrice(registry, solana, date, [usd, eur], priceMap);

      // This is expected to fail given the new design of the fiat converters.
      // Now, Oracle.getPrice should be considered as doing a "best effort"
      // to retrieve the prices in requested currencies.
      // It is caller's responsibility to ensure all needed prices are set, and
      // eventually call the fiat converter to fix missing prices.

      // --------------------------------------------------------------
      // The following lines patch the test for the new
      // fiat-conversion-is-caller's-responsibility semantic
      assert.isTrue(priceMap.has(eur));
      const eurPrice = priceMap.get(eur)!;
      const usdPrice = await fiatConverter.convert(
        registry,
        date,
        eurPrice,
        usd
      );
      priceMap.set(usd, usdPrice);
      // --END OF PATCH------------------------------------------------

      assert.isTrue(priceMap.has(eur));
      assert.isTrue(priceMap.has(usd));
      assert.closeTo(+priceMap.get(eur)!.rate, 217.91046376268642, EPSILON);
      assert.closeTo(
        +priceMap.get(usd)!.rate,
        217.91046376268642 * 1.2,
        EPSILON
      );
    });
  });
});
