import { assert } from "chai";

import { asChainID, Blockchain } from "../src/blockchain.mjs";

const TEST_CHAIN_ID = asChainID("test-ethereum");
const TEST_CHAIN_DATA = {
  "display-name": "Test Ethereum",
  "explorer-id": "test:1",
};

describe("Blockchain Singleton", function () {
  beforeEach(() => (Blockchain as any).__testResetRegistry());

  it("should set the name", function () {
    const eth = Blockchain.create(TEST_CHAIN_ID, TEST_CHAIN_DATA);

    assert.strictEqual(eth.name, TEST_CHAIN_ID);
  });

  it("should return the name of the blockchain when calling toString()", function () {
    const eth = Blockchain.create(TEST_CHAIN_ID, TEST_CHAIN_DATA);
    assert.strictEqual(
      eth.toString(),
      TEST_CHAIN_ID,
      "toString() should return the blockchain name",
    );
  });

  it("should return the same instance for the same blockchain name", function () {
    const eth1 = Blockchain.create(TEST_CHAIN_ID, TEST_CHAIN_DATA);
    const eth2 = Blockchain.create(TEST_CHAIN_ID, TEST_CHAIN_DATA);

    assert.strictEqual(
      eth1,
      eth2,
      "Instances for the same blockchain should be identical",
    );
  });

  it("should return different instances for different blockchain names", function () {
    const eth = Blockchain.create(TEST_CHAIN_ID, TEST_CHAIN_DATA);
    const btc = Blockchain.create(asChainID("test-bitcoin"), {
      "display-name": "Test Bitcoin",
      "explorer-id": "test:100",
    });

    assert.notStrictEqual(
      eth,
      btc,
      "Instances for different blockchains should not be identical",
    );
  });

  it("should be case insensitive when creating blockchain instances", function () {
    const eth1 = Blockchain.create(
      asChainID(TEST_CHAIN_ID.toLowerCase()),
      TEST_CHAIN_DATA,
    );
    const eth2 = Blockchain.create(
      asChainID(TEST_CHAIN_ID.toUpperCase()),
      TEST_CHAIN_DATA,
    );

    assert.strictEqual(
      eth1,
      eth2,
      "Instances should be the same regardless of case",
    );
  });

  it("should evaluate equality (==) correctly", function () {
    const eth1 = Blockchain.create(TEST_CHAIN_ID, TEST_CHAIN_DATA);
    const eth2 = Blockchain.create(TEST_CHAIN_ID, TEST_CHAIN_DATA);
    assert.isTrue(
      eth1 == eth2,
      "Equality operator (==) should return true for the same blockchain",
    );

    const btc = Blockchain.create(asChainID("test-bitcoin"), {
      "display-name": "Test Bitcoin",
      "explorer-id": "test:100",
    });
    assert.isFalse(
      eth1 === btc,
      "Equality operator (==) should return false for different blockchains",
    );
  });

  it("should evaluate identity (===) correctly", function () {
    const eth1 = Blockchain.create(TEST_CHAIN_ID, TEST_CHAIN_DATA);
    const eth2 = Blockchain.create(TEST_CHAIN_ID, TEST_CHAIN_DATA);
    assert.isTrue(
      eth1 === eth2,
      "Identity operator (===) should return true for the same blockchain",
    );

    const btc = Blockchain.create(asChainID("test-bitcoin"), {
      "display-name": "Test Bitcoin",
      "explorer-id": "test:100",
    });
    assert.isFalse(
      eth1 === btc,
      "Identity operator (===) should return false for different blockchains",
    );
  });
});
