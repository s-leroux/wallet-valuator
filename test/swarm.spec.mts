import { assert } from "chai";

import { Swarm } from "../src/swarm.mjs";
import { CryptoAsset } from "../src/cryptoasset.mjs";

import { Explorer } from "../src/services/explorer.mjs";
import { Address } from "../src/address.mjs";
import { FakeExplorer } from "./fake-explorer.mjs";
import { FakeCryptoResolver } from "./support/cryptoresolver.fake.mjs";
import { CryptoRegistry } from "../src/cryptoregistry.mjs";
import { Blockchain } from "../src/blockchain.mjs";

const ADDRESS = "0xAddress";
const CHAIN_NAME = "MyChain";

describe("Swarm", () => {
  const cryptoResolver = FakeCryptoResolver.create();
  let chain: Blockchain;
  let explorer: Explorer;
  let registry: CryptoRegistry;
  let swarm: Swarm;

  beforeEach(() => {
    chain = Blockchain.create(CHAIN_NAME);
    explorer = new FakeExplorer(chain);
    registry = CryptoRegistry.create();
    swarm = new Swarm([explorer], registry, cryptoResolver);
  });

  describe("Addresses", () => {
    it("should return implement the flyweight pattern", async () => {
      // see https://en.wikipedia.org/wiki/Flyweight_pattern
      const objA = await swarm.address(
        chain,
        registry,
        cryptoResolver,
        ADDRESS
      );
      const objB = await swarm.address(
        chain,
        registry,
        cryptoResolver,
        ADDRESS
      );

      assert.isObject(objA);
      assert.isObject(objB);
      assert.strictEqual(objA, objB);
    });

    it("should accumulate the added data", async () => {
      const objA = await swarm.address(
        chain,
        registry,
        cryptoResolver,
        ADDRESS,
        {
          from: "0x11111111",
        }
      );
      const objB = await swarm.address(
        chain,
        registry,
        cryptoResolver,
        ADDRESS,
        {
          to: "0x22222222",
        }
      );

      assert.isObject(objA);
      assert.isObject(objB);
      assert.strictEqual(objA, objB);
      assert.include(objA.data, { from: "0x11111111", to: "0x22222222" });
    });
  });
});
