import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;
import { CoinGecko } from "../../../src/services/oracles/coingecko.mjs";
import { CryptoAsset } from "../../../src/cryptoasset.mjs";
import { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import { Price } from "../../../src/price.mjs";

const MOCHA_TEST_TIMEOUT = 60000;
const API_KEY = process.env["COINGECKO_API_KEY"];

describe("CoinGecko", function () {
  if (!API_KEY) {
    throw Error("You must define the COINGECKO_API_KEY environment variable");
  }

  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT);

  let coingecko: CoinGecko | undefined;

  beforeEach(function () {
    coingecko = CoinGecko.create(API_KEY);
  });

  describe("API", () => {});

  describe("Utilities", () => {
    it("should return historical prices", async function () {
      const bitcoin = new CryptoAsset("bitcoin", "BTC", "bitcoin", 18);

      const test_cases: [string, string, Record<string, number>][] = [
        [
          "bitcoin",
          "30-12-2023",
          { btc: 1, usd: 42074.70715618848, eur: 38057.70863986569 },
        ],
      ];

      for (const [id, date, expected] of test_cases) {
        const prices = await coingecko!.getPrice(
          bitcoin,
          date,
          Object.keys(expected) as FiatCurrency[]
        );
        assert.equal(Object.keys(prices).length, Object.keys(expected).length);
        assert.deepEqual(
          Object.values(prices).reduce<Partial<typeof expected>>(
            (acc, price: Price) => {
              acc[price.currency] = price.amount;
              return acc;
            },
            {}
          ),
          expected
        );
      }
    });
  });
});
