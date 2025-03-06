import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { CoinGecko } from "../../../src/services/oracles/coingecko.mjs";
import { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import { Price } from "../../../src/price.mjs";
import { CryptoAsset } from "../../../src/cryptoasset.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";

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

  let coingecko: CoinGecko;
  let registry: CryptoRegistry;

  beforeEach(function () {
    coingecko = CoinGecko.create(API_KEY, INTERNAL_TO_COINGECKO_ID);
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
          { BTC: 1, USD: 93663.44751964067, EUR: 89809.00932731242 },
        ],
      ];

      for (const [id, date, expected] of test_cases) {
        register(`case ${id} ${date}`, async () => {
          const prices = await coingecko!.getPrice(
            registry,
            bitcoin,
            new Date(date),
            Object.keys(expected).map(FiatCurrency)
          );
          assert.containsAllKeys(prices, Object.keys(expected));
          for (const [currency, value] of Object.entries(expected)) {
            assert.equal(
              prices[FiatCurrency(currency)]?.rate.toNumber(),
              value
            );
          }
        });
      }
    });

    it("should properly URI encode the crypto id", async function () {
      // If the URI is not properly encoded, the price of the crypto below
      // will be resolved as if it was the "plain" bitcoin.
      const maliciousCrypto = new CryptoAsset(
        "/bitcoin",
        "fake bitcoin",
        "/BTC",
        18
      );
      const price = await coingecko.getPrice(
        registry,
        maliciousCrypto,
        new Date("2024-12-30"),
        ["eur"] as FiatCurrency[]
      );
      const expected = {};
      assert.deepEqual(price, expected);
    });

    describe("should convert from internal id to CoinGecko id", function () {
      const register = prepare(this);
      const idMapping = {
        usdc: "usd-coin",
      };

      // prettier-ignore
      const testcases = [
        [ "usdc", "usd-coin" ]
      ]
      for (const [internalId, expected] of testcases) {
        register(`case ${internalId} ⏵ ${expected}`, () => {
          const coingecko = CoinGecko.create(API_KEY, idMapping);
          const crypto = new CryptoAsset("usdc", "USDC", "USDC", 18);
          const coinGeckoId = coingecko.getCoinGeckoId(registry, crypto);
          assert.equal(coinGeckoId, expected);
        });
      }
    });
  });
});
