import { assert } from "chai";

import { Amount } from "../src/currency.mjs";
import { BigNumber } from "../src/bignumber.mjs";
import { Snapshot } from "../src/portfolio.mjs";

const mockCurrency = {
  chain: "Ethereum",
  address: "0x123456789abcdef",
  name: "Ether",
  symbol: "ETH",
  decimal: 18,
};

function mockMovement(
  ingress: boolean,
  timeStamp: number,
  amount: string,
  ...tags: [string, any][]
) {
  return [
    ingress,
    {
      timeStamp,
      amount: new Amount(mockCurrency, BigNumber.from(amount)),
    },
    new Map<string, any>(tags),
  ] as const;
}

describe("Snapshot", () => {
  describe("constructor", () => {
    it("should correctly initialize an instance", () => {
      const value = "100.5";
      const movement = mockMovement(true, 10, value, ["A", true], ["B", false]);
      console.dir(movement, { depth: 3 });
      const snapshot = new Snapshot(...movement);
      assert.equal(snapshot.holdings.size, 1);
      assert.equal(
        snapshot.holdings.get(mockCurrency).toString(),
        `${value} ${mockCurrency.symbol}`
      );
    });
  });
});
