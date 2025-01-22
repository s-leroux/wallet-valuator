import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { CoinGecko } from "../../../src/services/oracles/coingecko.mjs";
import type { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import type { Price } from "../../../src/price.mjs";

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
      const bitcoin = FakeCryptoAsset.bitcoin;

      const test_cases: [string, string, Record<string, number>][] = [
        [
          "bitcoin",
          "2024-12-30",
          { btc: 1, usd: 93663.44751964067, eur: 89809.00932731242 },
        ],
      ];

      for (const [id, date, expected] of test_cases) {
        const prices = await coingecko!.getPrice(
          bitcoin,
          new Date(date),
          Object.keys(expected) as FiatCurrency[]
        );
        assert.equal(Object.keys(prices).length, Object.keys(expected).length);
        assert.deepEqual(
          Object.values(prices).reduce<Partial<typeof expected>>(
            (acc, price: Price) => {
              acc[price.fiatCurrency] = price.rate;
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
