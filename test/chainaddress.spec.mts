import { assert } from "chai";
import { describe, it } from "mocha";
import { Blockchain } from "../src/blockchain.mjs";
import { ChainAddress, mangleChainAddress } from "../src/chainaddress.mjs";

describe("ChainAddress", () => {
  describe("constructor", () => {
    it("should create a ChainAddress with string chain", () => {
      const addr = ChainAddress("ethereum", "0x123");
      assert.strictEqual(addr.chain.name, "ethereum");
      assert.strictEqual(addr.address, "0x123");
    });

    it("should create a ChainAddress with Blockchain instance", () => {
      const chain = Blockchain.create("ethereum");
      const addr = ChainAddress(chain, "0x123");
      assert.strictEqual(addr.chain, chain);
      assert.strictEqual(addr.address, "0x123");
    });

    it("should handle null address", () => {
      const addr = ChainAddress("ethereum", null);
      assert.strictEqual(addr.chain.name, "ethereum");
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
      assert.strictEqual(addr.toString(), "ethereum:0x123");
    });

    it("should format without address", () => {
      const addr = ChainAddress("ethereum", null);
      assert.strictEqual(addr.toString(), "ethereum:");
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
    const chain = Blockchain.create("ethereum");
    const addr = ChainAddress(chain, "0x123");
    assert.strictEqual(mangleChainAddress(addr), "ethereum:0x123");
  });
});
