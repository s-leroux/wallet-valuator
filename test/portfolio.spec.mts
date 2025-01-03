import { assert } from "chai";

import { Amount } from "../src/currency.mjs";
import { BigNumber } from "../src/bignumber.mjs";
import { Snapshot } from "../src/portfolio.mjs";

const mockCurrencies = {
  ETH: {
    id: "ETH",
    name: "Ether",
    symbol: "ETH",
    decimal: 18,
  },
  USDT: {
    id: "USDT",
    name: "Tether USD",
    symbol: "USDT",
    decimal: 6,
  },
  DAI: {
    id: "DAI",
    name: "Dai Stablecoin",
    symbol: "DAI",
    decimal: 18,
  },
};

function mockMovement(
  ingress: boolean,
  timeStamp: number,
  amount: string,
  currency: keyof typeof mockCurrencies,
  ...tags: [string, any][]
) {
  return [
    ingress,
    {
      timeStamp,
      amount: new Amount(mockCurrencies[currency], BigNumber.from(amount)),
    },
    new Map(tags),
  ] as const;
}

describe("Snapshot", () => {
  describe("constructor", () => {
    it("should correctly initialize an instance", () => {
      const value = "100.5";
      const movement = mockMovement(
        true,
        10,
        value,
        "ETH",
        ["A", true],
        ["B", false]
      );
      const snapshot = new Snapshot(...movement);
      assert.equal(snapshot.holdings.size, 1);
      assert.equal(
        snapshot.holdings.get(mockCurrencies.ETH).toString(),
        `${value} ${mockCurrencies.ETH.symbol}`
      );
    });

    it("should correctly initialize an instance from a parent", () => {
      const movements = [
        mockMovement(true, 10, "100", "DAI"),
        mockMovement(true, 20, "200", "ETH"),
        mockMovement(false, 30, "25", "DAI"),
        mockMovement(true, 40, "300", "ETH"),
      ];

      let snapshot: Snapshot;
      for (const movement of movements) {
        snapshot = new Snapshot(...movement, snapshot);
      }

      assert.equal(snapshot.holdings.size, 2);
      assert.equal(
        snapshot.holdings.get(mockCurrencies.ETH).toString(),
        "500 ETH"
      );
      assert.equal(
        snapshot.holdings.get(mockCurrencies.DAI).toString(),
        "75 DAI"
      );
    });
  });
});
