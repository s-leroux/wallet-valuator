import { assert } from "chai";
import { describe, it } from "mocha";
import { Blockchain } from "../src/blockchain.mjs";
import { ChainAddress, mangleChainAddress } from "../src/chainaddress.mjs";
import {
  FAKE_ETH_CHAIN_ID,
  FAKE_ETH_CHAIN_DATA,
} from "./support/blockchain.fake.mjs";

describe("ChainAddress", () => {
  describe("constructor", () => {
    it("should create a ChainAddress with string chain", () => {
      Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA); // ISSUE #212: Hack
      const addr = ChainAddress(FAKE_ETH_CHAIN_ID, "0x123");
      assert.strictEqual(addr.chain.id, FAKE_ETH_CHAIN_ID);
      assert.strictEqual(addr.address, "0x123");
    });

    it("should create a ChainAddress with Blockchain instance", () => {
      const chain = Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA);
      const addr = ChainAddress(chain, "0x123");
      assert.strictEqual(addr.chain, chain);
      assert.strictEqual(addr.address, "0x123");
    });

    it("should handle null address", () => {
      const addr = ChainAddress("ethereum", null);
      assert.strictEqual(addr.chain.id, "ethereum");
      assert.isNull(addr.address);
    });

    it("should normalize address to lowercase", () => {
      const addr = ChainAddress("ethereum", "0xABC");
      assert.strictEqual(addr.address, "0xabc");
    });
  });

  describe("toString", () => {
    it("should format with address", () => {
      const addr = ChainAddress("ethereum", "0x123");
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      assert.strictEqual(String(addr), "ethereum:0x123");
    });

    it("should format without address", () => {
      const addr = ChainAddress("ethereum", null);
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      assert.strictEqual(String(addr), "ethereum:");
    });
  });

  describe("caching", () => {
    it("should return the same instance for same inputs", () => {
      const addr1 = ChainAddress("ethereum", "0x123");
      const addr2 = ChainAddress("ethereum", "0x123");
      assert.strictEqual(addr1, addr2);
    });

    it("should handle case-insensitive chain names", () => {
      const addr1 = ChainAddress("Ethereum", "0x123");
      const addr2 = ChainAddress("ethereum", "0x123");
      assert.strictEqual(addr1, addr2);
    });

    it("should handle case-insensitive addresses", () => {
      const addr1 = ChainAddress("ethereum", "0xABC");
      const addr2 = ChainAddress("ethereum", "0xabc");
      assert.strictEqual(addr1, addr2);
    });
  });
});

describe("mangleChainAddress", () => {
  it("should format with address", () => {
    const addr = ChainAddress("ethereum", "0x123");
    assert.strictEqual(mangleChainAddress(addr), "ethereum:0x123");
  });

  it("should format without address", () => {
    const addr = ChainAddress("ethereum", null);
    assert.strictEqual(mangleChainAddress(addr), "ethereum:");
  });

  it("should handle Blockchain instance", () => {
    const chain = Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA);
    const addr = ChainAddress(chain, "0x123");
    assert.strictEqual(mangleChainAddress(addr), FAKE_ETH_CHAIN_ID + ":0x123");
  });
});
