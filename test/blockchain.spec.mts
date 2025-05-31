import { assert } from "chai";

import { Blockchain } from "../src/blockchain.mjs";

before(function () {
  process.env.NODE_ENV = "test"; // ISSUE #132 Ensures NODE_ENV is set for this test file. We should find a more global solution.
});

describe("Blockchain Singleton", function () {
  beforeEach(() => (Blockchain as any).__testResetRegistry());

  it("should set the name", function () {
    const eth = Blockchain.create("ethereum");

    assert.strictEqual(eth.name, "ethereum");
  });

  it("should return the name of the blockchain when calling toString()", function () {
    const eth = Blockchain.create("ethereum");
    assert.strictEqual(
      eth.toString(),
      "ethereum",
      "toString() should return the blockchain name"
    );
  });

  it("should return the same instance for the same blockchain name", function () {
    const eth1 = Blockchain.create("ethereum");
    const eth2 = Blockchain.create("ethereum");

    assert.strictEqual(
      eth1,
      eth2,
      "Instances for the same blockchain should be identical"
    );
  });

  it("should return different instances for different blockchain names", function () {
    const eth = Blockchain.create("ethereum");
    const btc = Blockchain.create("bitcoin");

    assert.notStrictEqual(
      eth,
      btc,
      "Instances for different blockchains should not be identical"
    );
  });

  it("should be case insensitive when creating blockchain instances", function () {
    const eth1 = Blockchain.create("ethereum");
    const eth2 = Blockchain.create("ETHEREUM");
    const eth3 = Blockchain.create("Ethereum");

    assert.strictEqual(
      eth1,
      eth2,
      "Instances should be the same regardless of case"
    );
    assert.strictEqual(
      eth1,
      eth3,
      "Instances should be the same regardless of case"
    );
  });

  it("should evaluate equality (==) correctly", function () {
    const eth1 = Blockchain.create("ethereum");
    const eth2 = Blockchain.create("ethereum");
    assert.isTrue(
      eth1 == eth2,
      "Equality operator (==) should return true for the same blockchain"
    );

    const btc = Blockchain.create("bitcoin");
    assert.isFalse(
      eth1 === btc,
      "Equality operator (==) should return false for different blockchains"
    );
  });

  it("should evaluate identity (===) correctly", function () {
    const eth1 = Blockchain.create("ethereum");
    const eth2 = Blockchain.create("ethereum");
    assert.isTrue(
      eth1 === eth2,
      "Identity operator (===) should return true for the same blockchain"
    );

    const btc = Blockchain.create("bitcoin");
    assert.isFalse(
      eth1 === btc,
      "Identity operator (===) should return false for different blockchains"
    );
  });
});
