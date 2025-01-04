import { assert } from "chai";

import { Coin, get_coin_by_oracle_id } from "../src/coin.mjs";

describe("Coin", function () {
  describe("get_coin_by_oracle_id", async function () {
    it("should throw an error if not found", async function () {
      assert.throws(() => {
        const coin = get_coin_by_oracle_id("non-existant-id");
      });
    });

    it("should find a coin by its orace id", async function () {
      const coin = get_coin_by_oracle_id("usd-coin");
      assert.isNotNull(coin);
      assert.include(coin, {
        ticker: "USDC",
        name: "USDC",
        oracle_id: "usd-coin",
      });
    });
  });
});
