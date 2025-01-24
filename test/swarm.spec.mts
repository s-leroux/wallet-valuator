import { assert } from "chai";

import { Swarm } from "../src/swarm.mjs";
import { CryptoAsset } from "../src/cryptoasset.mjs";

import { Explorer } from "../src/services/explorer.mjs";
import { Address } from "../src/address.mjs";
import { FakeExplorer } from "./fake-explorer.mjs";
import { FakeCryptoResolver } from "./support/cryptoresolver.fake.mjs";
import { CryptoRegistry } from "../src/cryptoregistry.mjs";

const ADDRESS = "0xAddress";
const CHAIN_NAME = "MyChain";

describe("Swarm", () => {
  const cryptoResolver = new FakeCryptoResolver();
  let explorer: Explorer;
  let registry: CryptoRegistry;
  let swarm: Swarm;

  beforeEach(() => {
    explorer = new FakeExplorer(CHAIN_NAME);
    registry = CryptoRegistry.create();
    swarm = new Swarm([explorer], registry, cryptoResolver);
  });

  describe("Addresses", () => {
    it("should return implement the flyweight pattern", () => {
      // see https://en.wikipedia.org/wiki/Flyweight_pattern
      const objA = swarm.address(explorer, registry, cryptoResolver, ADDRESS);
      const objB = swarm.address(explorer, registry, cryptoResolver, ADDRESS);

      assert.isObject(objA);
      assert.isObject(objB);
      assert.strictEqual(objA, objB);
    });

    it("should accumulate the added data", () => {
      const objA = swarm.address(explorer, registry, cryptoResolver, ADDRESS, {
        from: "0x11111111",
      });
      const objB = swarm.address(explorer, registry, cryptoResolver, ADDRESS, {
        to: "0x22222222",
      });

      assert.isObject(objA);
      assert.isObject(objB);
      assert.strictEqual(objA, objB);
      assert.include(objA.data, { from: "0x11111111", to: "0x22222222" });
    });
  });
});
