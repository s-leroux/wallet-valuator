import { assert } from "chai";

import { Swarm } from "../src/swarm.mjs";
import { Currency } from "../src/currency.mjs";

import { Explorer } from "../src/services/explorer.mjs";
import { FakeExplorer } from "./fake-explorer.mjs";

const ADDRESS = "0xAddress";
const CHAIN_NAME = "MyChain";

describe("Swarm", () => {
  let swarm: Swarm;
  let explorer: Explorer;

  beforeEach(() => {
    explorer = new FakeExplorer(CHAIN_NAME);
    swarm = new Swarm([explorer]);
  });

  describe("Addresses", () => {
    it("should return implement the flyweight pattern", () => {
      // see https://en.wikipedia.org/wiki/Flyweight_pattern
      const objA = swarm.address(explorer, ADDRESS);
      const objB = swarm.address(explorer, ADDRESS);

      assert.isObject(objA);
      assert.isObject(objB);
      assert.strictEqual(objA, objB);
    });

    it("should accumulate the added data", () => {
      const objA = swarm.address(explorer, ADDRESS, { from: "0x11111111" });
      const objB = swarm.address(explorer, ADDRESS, { to: "0x22222222" });

      assert.isObject(objA);
      assert.isObject(objB);
      assert.strictEqual(objA, objB);
      assert.include(objA.data, { from: "0x11111111", to: "0x22222222" });
    });

    it("should create a currency when required data are detected", () => {
      const obj = swarm.address(explorer, ADDRESS);

      const token = {
        tokenName: "Ether",
        tokenSymbol: "ETH",
        tokenDecimal: 18,
      };

      assert.isUndefined(obj.currency);
      obj.assign(swarm, token);

      const currency: Currency = obj.currency;
      assert.isDefined(currency);
      assert.equal(currency.name, token.tokenName);
      assert.equal(currency.symbol, token.tokenSymbol);
      assert.strictEqual(currency.decimal, token.tokenDecimal);
      assert.equal(currency.chain, CHAIN_NAME);
    });
  });
});
