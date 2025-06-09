import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import type { Oracle } from "../../../src/services/oracle.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { FixedFiatConverter } from "../../support/fiatconverter.fake.mjs";
import { FiatConverter } from "../../../src/services/fiatconverter.mjs";
import { DefiLlamaOracle } from "../../../src/services/defillama/defillamaoracle.mjs";
import { FakeDefiLlamaAPI } from "../../support/defillamaapi.fake.mjs";
import { DefiLlamaAPI } from "../../../src/services/defillama/defillamaapi.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";

const INTERNAL_TO_COINGECKO_ID = {
  bitcoin: "bitcoin",
};

describe("DefiLlamaOracle", function () {
  const { bitcoin } = FakeCryptoAsset;
  const { EUR, USD } = FakeFiatCurrency;
  const RATE = 1.2;

  let api: DefiLlamaAPI;
  let oracle: Oracle;
  let registry: CryptoRegistry;

  beforeEach(function () {
    registry = CryptoRegistry.create();
    api = FakeDefiLlamaAPI.create();
    oracle = DefiLlamaOracle.create(api, INTERNAL_TO_COINGECKO_ID);
  });

  describe("getPrice()", () => {
    it("should return the price in the requested fiat currencie", async function () {
      const priceMap = new Map() as PriceMap;
      await oracle.getPrice(
        registry,
        bitcoin,
        new Date("2023-10-01"),
        [USD, EUR],
        priceMap
      );

      assert.isTrue(priceMap.has(USD));
      assert.equal(+priceMap.get(USD)!.rate, 26966.11831093055);
    });
  });
});
