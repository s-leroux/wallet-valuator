import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeOracle } from "../../support/oracle.fake.mjs";
import { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import {
  CryptoMetadata,
  CryptoRegistryNG,
} from "../../../src/cryptoregistry.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";
import { registerRuntimePinnedBuildTest } from "../../support/runtime-pinned-build.helper.mjs";
import { DEFAULT_PRICE_SCALE } from "../../../src/price.mjs";
import { Fixed } from "../../../src/bignumber.mjs";

describe("FakeOracle", function () {
  registerRuntimePinnedBuildTest();

  let fakeoracle: FakeOracle | undefined;
  let cryptoRegistry: CryptoRegistryNG;
  let cryptoMetadata: CryptoMetadata;

  beforeEach(function () {
    fakeoracle = FakeOracle.create();
    cryptoRegistry = CryptoRegistryNG.create();
    cryptoMetadata = CryptoMetadata.create();
  });

  describe("API", () => {});

  describe("Utilities", () => {
    it("should return historical prices", async function () {
      const bitcoin = FakeCryptoAsset.bitcoin;

      const test_cases: [string, string, Record<string, string>][] = [
        [
          "bitcoin",
          "2024-12-30",
          {
            btc: "1",
            usd: "93663.44751964067",
            eur: "89809.00932731242",
          },
        ],
      ];

      for (const [, date, expected] of test_cases) {
        const priceMap = new Map() as PriceMap;
        await fakeoracle!.getPrice(
          cryptoRegistry,
          cryptoMetadata,
          bitcoin,
          new Date(date),
          new Set(Object.keys(expected).map(FiatCurrency)),
          priceMap,
        );

        assert.equal(priceMap.size, Object.keys(expected).length);
        for (const [currency, expectedRate] of Object.entries(expected)) {
          const price = priceMap.get(FiatCurrency(currency));
          assert.exists(price, `Price for ${currency} should exist`);
          assert.equal(
            price.rate.toDecimalString(DEFAULT_PRICE_SCALE),
            Fixed.fromString(expectedRate).toDecimalString(DEFAULT_PRICE_SCALE),
            `rate for ${currency}`,
          );
          assert.equal(price.fiatCurrency, FiatCurrency(currency));
          assert.equal(price.crypto, bitcoin);
        }
      }
    });
  });
});
