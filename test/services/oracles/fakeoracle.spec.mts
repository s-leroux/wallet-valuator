import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeOracle } from "../../support/oracle.fake.mjs";
import { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";
import { FiatConverter } from "../../../src/services/fiatconverter.mjs";
import { NullFiatConverter } from "../../../src/services/fiatconverter.mjs";

describe("FakeOracle", function () {
  let fakeoracle: FakeOracle | undefined;
  let registry: CryptoRegistry;
  let fiatConverter: FiatConverter;

  beforeEach(function () {
    fakeoracle = FakeOracle.create();
    registry = CryptoRegistry.create();
    fiatConverter = new NullFiatConverter();
  });

  describe("API", () => {});

  describe("Utilities", () => {
    it("should return historical prices", async function () {
      const bitcoin = FakeCryptoAsset.bitcoin;

      const test_cases: [string, string, Record<string, number>][] = [
        [
          "bitcoin",
          "2024-12-30",
          { btc: 1, usd: 93663.44751964067, eur: 89809.00932731242 },
        ],
      ];

      for (const [id, date, expected] of test_cases) {
        const priceMap = new Map() as PriceMap;
        await fakeoracle!.getPrice(
          registry,
          bitcoin,
          new Date(date),
          Object.keys(expected).map(FiatCurrency),
          fiatConverter,
          priceMap
        );

        assert.equal(priceMap.size, Object.keys(expected).length);
        for (const [currency, expectedRate] of Object.entries(expected)) {
          const price = priceMap.get(FiatCurrency(currency));
          assert.exists(price, `Price for ${currency} should exist`);
          assert.equal(+price.rate, expectedRate);
          assert.equal(price.fiatCurrency, FiatCurrency(currency));
          assert.equal(price.crypto, bitcoin);
        }
      }
    });
  });
});
