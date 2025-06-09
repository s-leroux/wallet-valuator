import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import {
  CoinGeckoOracle,
  getCoinGeckoId,
} from "../../../src/services/oracles/coingecko.mjs";
import { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";

import { prepare } from "../../support/register.helper.mjs";

const MOCHA_TEST_TIMEOUT = 60000;
const API_KEY = process.env["COINGECKO_API_KEY"];

const INTERNAL_TO_COINGECKO_ID = {
  bitcoin: "bitcoin",
};

describe("CoinGecko", function () {
  if (!API_KEY) {
    throw Error("You must define the COINGECKO_API_KEY environment variable");
  }

  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT);

  let coingecko: CoinGeckoOracle;
  let registry: CryptoRegistry;

  beforeEach(function () {
    coingecko = CoinGeckoOracle.create(API_KEY, INTERNAL_TO_COINGECKO_ID);
    registry = CryptoRegistry.create();
  });

  describe("API", () => {});

  describe("getPrice", function () {
    describe("should return historical prices", function () {
      const register = prepare(this);

      const bitcoin = FakeCryptoAsset.bitcoin;

      const test_cases: [string, string, Record<string, number>][] = [
        [
          "bitcoin",
          "2024-12-30",
          {
            BTC: 1,
            USD: 93663.44751964067,
            EUR: 89809.00932731242,
          },
        ],
      ];

      for (const [id, date, expected] of test_cases) {
        register(`case ${id} ${date}`, async () => {
          const priceMap = new Map() as PriceMap;
          await coingecko!.getPrice(
            registry,
            bitcoin,
            new Date(date),
            new Set(Object.keys(expected).map(FiatCurrency)),
            priceMap
          );
          const expectedCurrencies = Object.keys(expected).map((code) =>
            FiatCurrency(code)
          );
          assert.includeMembers(
            Array.from(priceMap.keys()),
            expectedCurrencies
          );
          for (const [currency, value] of Object.entries(expected)) {
            const fiatCurrency = FiatCurrency(currency);
            const price = priceMap.get(fiatCurrency);
            assert.exists(price, `Price for ${currency} should exist`);
            if (price) {
              assert.equal(price.rate.toNumber(), value);
            }
          }
        });
      }
    });

    it("should properly URI encode the crypto id", async function () {
      // If the URI is not properly encoded, the price of the crypto below
      // will be resolved as if it was the "plain" bitcoin.
      const maliciousCrypto = registry.createCryptoAsset(
        "/bitcoin",
        "fake bitcoin",
        "/BTC",
        18
      );
      const priceMap = new Map() as PriceMap;
      await coingecko.getPrice(
        registry,
        maliciousCrypto,
        new Date("2024-12-30"),
        new Set([FiatCurrency("eur")]),
        priceMap
      );
      assert.equal(priceMap.size, 0);
    });

    describe("should convert from internal id to CoinGecko id", function () {
      const register = prepare(this);
      const idMapping = {
        usdc: "usd-coin",
      };

      // prettier-ignore
      const testcases = [
        [ "usdc", "usd-coin" ]
      ];
      for (const [internalId, expected] of testcases) {
        register(`case ${internalId} ⏵ ${expected}`, () => {
          const crypto = registry.createCryptoAsset("usdc", "USDC", "USDC", 6);
          const coinGeckoId = getCoinGeckoId(registry, crypto, idMapping);
          assert.equal(coinGeckoId, expected);
        });
      }
    });
  });
});
