import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeOracle } from "../../support/oracle.fake.mjs";
import { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import { Price } from "../../../src/price.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";

describe("FakeOracle", function () {
  let fakeoracle: FakeOracle | undefined;
  let registry: CryptoRegistry;

  beforeEach(function () {
    fakeoracle = FakeOracle.create();
    registry = CryptoRegistry.create();
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
        const prices = await fakeoracle!.getPrice(
          registry,
          bitcoin,
          new Date(date),
          Object.keys(expected) as FiatCurrency[]
        );
        assert.equal(Object.keys(prices).length, Object.keys(expected).length);
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
      }
    });
  });
});
