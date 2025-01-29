import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { CoinGecko } from "../../../src/services/oracles/coingecko.mjs";
import type { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import { Price } from "../../../src/price.mjs";
import { CryptoAsset } from "../../../src/cryptoasset.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";

import { prepare } from "../../support/register.helper.mjs";

const MOCHA_TEST_TIMEOUT = 60000;
const API_KEY = process.env["COINGECKO_API_KEY"];

describe("CoinGecko", function () {
  if (!API_KEY) {
    throw Error("You must define the COINGECKO_API_KEY environment variable");
  }

  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT);

  let coingecko: CoinGecko;
  let registry: CryptoRegistry;

  beforeEach(function () {
    coingecko = CoinGecko.create(API_KEY);
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
          { btc: 1, usd: 93663.44751964067, eur: 89809.00932731242 },
        ],
      ];

      for (const [id, date, expected] of test_cases) {
        register(`case ${id} ${date}`, async () => {
          const prices = await coingecko!.getPrice(
            registry,
            bitcoin,
            new Date(date),
            Object.keys(expected) as FiatCurrency[]
          );
          assert.equal(
            Object.keys(prices).length,
            Object.keys(expected).length
          );
          assert.deepEqual(
            Object.values(prices).reduce<Partial<typeof expected>>(
              (acc, price: Price) => {
                acc[price.fiatCurrency] = +price.rate;
                return acc;
              },
              {}
            ),
            expected
          );
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
      const expected = {
        eur: new Price(
          maliciousCrypto,
          "eur" as FiatCurrency,
          0 // XXX ISSUE #27 CoinGecko silently defaults to 0
        ),
      };
      assert.deepEqual(price, expected);
    });
  });
});
