import { assert } from "chai";

import { Swarm } from "../src/swarm.mjs";

import { Explorer } from "../src/services/explorer.mjs";
import { FakeExplorer } from "./support/explorer.fake.mjs";
import { FakeCryptoResolver } from "./support/cryptoresolver.fake.mjs";
import { CryptoRegistryNG, CryptoMetadata } from "../src/cryptoregistry.mjs";
import { Blockchain } from "../src/blockchain.mjs";
import {
  FAKE_ETH_CHAIN_ID,
  FAKE_ETH_CHAIN_DATA,
} from "./support/blockchain.fake.mjs";

const ADDRESS = "0xAddress";

describe("Swarm", () => {
  let chain: Blockchain;
  let explorer: Explorer;
  let cryptoRegistry: CryptoRegistryNG;
  let swarm: Swarm;
  let cryptoResolver: FakeCryptoResolver;
  let cryptoMetadata: CryptoMetadata;

  beforeEach(() => {
    chain = Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA);
    cryptoRegistry = CryptoRegistryNG.create();
    cryptoMetadata = CryptoMetadata.create();
    cryptoResolver = FakeCryptoResolver.create();
    explorer = new FakeExplorer(cryptoRegistry, chain);
    swarm = Swarm.create(
      [explorer],
      cryptoRegistry,
      cryptoMetadata,
      cryptoResolver,
    );
  });

  describe("Addresses", () => {
    it("should return implement the flyweight pattern", async () => {
      // see https://en.wikipedia.org/wiki/Flyweight_pattern
      const objA = await swarm.address(chain, ADDRESS);
      const objB = await swarm.address(chain, ADDRESS);

      assert.isObject(objA);
      assert.isObject(objB);
      assert.strictEqual(objA, objB);
    });

    it("should accumulate the added data", async () => {
      const objA = await swarm.address(chain, ADDRESS, {
        tokenName: "USDC",
      });
      const objB = await swarm.address(chain, ADDRESS, {
        tokenDecimal: 6,
      });

      assert.isObject(objA);
      assert.isObject(objB);
      assert.strictEqual(objA, objB);
      assert.include(objA.data, { tokenName: "USDC", tokenDecimal: 6 });
    });
  });

  describe("getExplorer()", () => {
    it("should return the explorer by its chain name", () => {
      const result = swarm.getExplorer(FAKE_ETH_CHAIN_ID);

      assert.exists(result);
      assert.equal(result.chain, chain);
      assert.strictEqual(result.chain, chain);
    });

    it("should throw if the blockchain is unknown", () => {
      assert.throws(() => {
        swarm.getExplorer(FAKE_ETH_CHAIN_ID + "X");
      });
    });
  });

  describe("getNativeCurrency()", () => {
    it("should return the native currency for a blockchain", () => {
      const result = swarm.getNativeCurrency(FAKE_ETH_CHAIN_ID);

      assert.exists(result);
      assert.equal(result, explorer.nativeCurrency);
      assert.strictEqual(result, explorer.nativeCurrency);
    });

    it("should throw if the blockchain is unknown", () => {
      assert.throws(() => {
        swarm.getNativeCurrency(FAKE_ETH_CHAIN_ID + "X");
      });
    });
  });

  describe("registry", () => {
    it("should be stored and accessible in the swarm", () => {
      assert.strictEqual(swarm.cryptoRegistry, cryptoRegistry);
    });
  });
});
