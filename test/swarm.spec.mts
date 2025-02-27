import { assert } from "chai";

import { Swarm } from "../src/swarm.mjs";

import { Explorer } from "../src/services/explorer.mjs";
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
    swarm = Swarm.create([explorer], registry, cryptoResolver);
  });

  describe("Addresses", () => {
    it("should return implement the flyweight pattern", async () => {
      // see https://en.wikipedia.org/wiki/Flyweight_pattern
      const objA = await swarm.address(chain, cryptoResolver, ADDRESS);
      const objB = await swarm.address(chain, cryptoResolver, ADDRESS);

      assert.isObject(objA);
      assert.isObject(objB);
      assert.strictEqual(objA, objB);
    });

    it("should accumulate the added data", async () => {
      const objA = await swarm.address(chain, cryptoResolver, ADDRESS, {
        from: "0x11111111",
      });
      const objB = await swarm.address(chain, cryptoResolver, ADDRESS, {
        to: "0x22222222",
      });

      assert.isObject(objA);
      assert.isObject(objB);
      assert.strictEqual(objA, objB);
      assert.include(objA.data, { from: "0x11111111", to: "0x22222222" });
    });
  });

  describe("getExplorer()", () => {
    it("should return the explorer by its chain name", () => {
      const result = swarm.getExplorer(CHAIN_NAME);

      assert.exists(result);
      assert.equal(result.chain, chain);
      assert.strictEqual(result.chain, chain);
    });

    it("should throw if the blockchain is unknown", () => {
      assert.throws(() => {
        swarm.getExplorer(CHAIN_NAME + "X");
      });
    });
  });

  describe("getNativeCurrency()", () => {
    it("should return the native currency for a blockchain", () => {
      const result = swarm.getNativeCurrency(CHAIN_NAME);

      assert.exists(result);
      assert.equal(result, explorer.nativeCurrency);
      assert.strictEqual(result, explorer.nativeCurrency);
    });

    it("should throw if the blockchain is unknown", () => {
      assert.throws(() => {
        swarm.getNativeCurrency(CHAIN_NAME + "X");
      });
    });
  });

  describe("registry", () => {
    it("should be stored and accessible in the swarm", () => {
      assert.strictEqual(swarm.registry, registry);
    });
  });
});
