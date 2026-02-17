// ===========================================================================
//  Imports
// ===========================================================================
import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";
import { DefaultDefiLlamaAPI } from "../../../src/services/defillama/defillamaapi.mjs";
import { WellKnownCryptoAssets } from "../../../src/wellknowncryptoassets.mjs";

// ===========================================================================
//  Constants
// ===========================================================================
const MOCHA_TEST_TIMEOUT = 10000;

const api = DefaultDefiLlamaAPI.create();

// ===========================================================================
//  Tests
// ===========================================================================
describe("DefiLlama API", function () {
  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT / 2);

  describe("getHistoricalPrices()", function () {
    const DATE = "2023-10-01";
    const TOKENS = [
      "ethereum:0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
      "ethereum:0xA0b86991C6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      "coingecko:bitcoin",
    ];

    const date = new Date(DATE);

    it("should retrieve prices for known tokens", async () => {
      const result = await api.getHistoricalPrices(date, TOKENS);

      assert.isObject(result);
      assert.isObject(result.coins);

      for (const token of TOKENS) {
        assert.property(result.coins, token);
        const data = result.coins[token];
        assert.containsAllKeys(data, ["price", "symbol", "timestamp"]);
        assert.isAbove(data.price, 0);
        assert.closeTo(data.timestamp * 1000, date.getTime(), 1000 * 1000);
      }
    });

    it("should handle unknown tokens gracefully", async () => {
      const UNKNOWN = ["ethereum:0x000000000000000000000000000000000000dead"];
      const result = await api.getHistoricalPrices(date, UNKNOWN);

      assert.isObject(result);
      assert.isObject(result.coins);
      assert.notProperty(result.coins, UNKNOWN[0]);
    });

    describe("should handle chain update from matic-network to polygon-ecosystem-token", function () {
      // prettier-ignore
      const TEST_CASES:[dateString:string, coinGeckoId:string][] = [
        ["2024-11-17", "coingecko:polygon-ecosystem-token"],
        ["2025-11-17", "coingecko:polygon-ecosystem-token"],
        ["2025-12-31", "coingecko:polygon-ecosystem-token"],
      ] as const;

      const register = prepare(this);
      for (const [dateString, coinGeckoId] of TEST_CASES) {
        register(`${dateString} ${coinGeckoId}`, async function () {
          const date = new Date(dateString);
          const result = await api.getHistoricalPrices(date, [coinGeckoId]);

          assert.property(result.coins, coinGeckoId);
          assert.containsAllKeys(result.coins[coinGeckoId], [
            "price",
            "symbol",
            "timestamp",
          ]);
        });
      }
    });

    describe("should handle all well known crypto-assets", function () {
      const coinGeckoIds = new Set<string>();
      for (const cryptoAsset of WellKnownCryptoAssets) {
        const coinGeckoId = cryptoAsset[4]?.coingeckoId;
        if (coinGeckoId) {
          coinGeckoIds.add(coinGeckoId);
        }
      }

      const register = prepare(this);
      for (const id of coinGeckoIds) {
        const coinGeckoId = `coingecko:${id}`;
        register(`${coinGeckoId}`, async function () {
          const date = new Date("2025-02-14");
          const result = await api.getHistoricalPrices(date, [coinGeckoId]);

          assert.property(result.coins, coinGeckoId);
          assert.containsAllKeys(result.coins[coinGeckoId], [
            "price",
            "symbol",
            "timestamp",
          ]);
        });
      }
    });
  });
});
