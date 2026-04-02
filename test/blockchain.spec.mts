import { assert } from "chai";

import { asBlockchainInternalId, Blockchain } from "../src/blockchain.mjs";
import {
  FAKE_ETH_CHAIN_ID,
  FAKE_ETH_CHAIN_DATA,
  FAKE_BTC_CHAIN_ID,
  FAKE_BTC_CHAIN_DATA,
} from "./support/blockchain.fake.mjs";
import { prepare } from "./support/register.helper.mjs";

describe("Blockchain", function () {
  beforeEach(() => Blockchain.__testResetRegistry());

  it("should throw an error if the blockchain is not found", function () {
    assert.throws(() => Blockchain.find("unknown-blockchain"));
  });

  it("should set the displayname", function () {
    const eth = Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA);

    assert.strictEqual(eth.displayName, FAKE_ETH_CHAIN_DATA["display-name"]);
  });

  it("should follow redirects", function () {
    const xdai = Blockchain.find("xdai");
    const gnosis = Blockchain.find("gnosis");

    assert.strictEqual(
      xdai,
      gnosis,
      "XDAI and Gnosis should be the same blockchain",
    );
  });

  it("should return the name of the blockchain when calling toString()", function () {
    const eth = Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA);
    assert.strictEqual(
      eth.toString(),
      FAKE_ETH_CHAIN_ID,
      "toString() should return the blockchain name",
    );
  });

  it("should return the same instance for the same blockchain name", function () {
    const eth1 = Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA);
    const eth2 = Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA);

    assert.strictEqual(
      eth1,
      eth2,
      "Instances for the same blockchain should be identical",
    );
  });

  it("should return different instances for different blockchain names", function () {
    const eth = Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA);
    const btc = Blockchain.create(FAKE_BTC_CHAIN_ID, FAKE_BTC_CHAIN_DATA);

    assert.notStrictEqual(
      eth,
      btc,
      "Instances for different blockchains should not be identical",
    );
  });

  it("should be case insensitive when creating blockchain instances", function () {
    const eth1 = Blockchain.create(
      asBlockchainInternalId(FAKE_ETH_CHAIN_ID.toLowerCase()),
      FAKE_ETH_CHAIN_DATA,
    );
    const eth2 = Blockchain.create(
      asBlockchainInternalId(FAKE_ETH_CHAIN_ID.toUpperCase()),
      FAKE_ETH_CHAIN_DATA,
    );

    assert.strictEqual(
      eth1,
      eth2,
      "Instances should be the same regardless of case",
    );
  });

  it("should evaluate equality (==) correctly", function () {
    const eth1 = Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA);
    const eth2 = Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA);
    assert.isTrue(
      eth1 == eth2,
      "Equality operator (==) should return true for the same blockchain",
    );

    const btc = Blockchain.create(FAKE_BTC_CHAIN_ID, FAKE_BTC_CHAIN_DATA);
    assert.isFalse(
      eth1 === btc,
      "Equality operator (==) should return false for different blockchains",
    );
  });

  it("should evaluate identity (===) correctly", function () {
    const eth1 = Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA);
    const eth2 = Blockchain.create(FAKE_ETH_CHAIN_ID, FAKE_ETH_CHAIN_DATA);
    assert.isTrue(
      eth1 === eth2,
      "Identity operator (===) should return true for the same blockchain",
    );

    const btc = Blockchain.create(FAKE_BTC_CHAIN_ID, FAKE_BTC_CHAIN_DATA);
    assert.isFalse(
      eth1 === btc,
      "Identity operator (===) should return false for different blockchains",
    );
  });
});

import { WellKnownBlockchains } from "../src/data/wellknownblockchains.mjs";
import { CryptoRegistryNG } from "../src/cryptoregistry.mjs";

describe("Well-known blockchains", function () {
  describe("should be able to create a blockchain instance from a well-known internal ID", function () {
    const register = prepare(this);

    // prettier-ignore
    const testCases = [
      { id: "ethereum", displayName: "Ethereum" },
      { id: "bitcoin", displayName: "Bitcoin" },
      { id: "solana", displayName: "Solana" },
      { id: "polygon", displayName: "Polygon" },
      { id: "bnb-chain", displayName: "BNB Chain" },
    ];

    for (const testCase of testCases) {
      register(`case of ${testCase.id}`, function () {
        const blockchain = Blockchain.find(testCase.id);
        assert.strictEqual(blockchain.displayName, testCase.displayName);
      });
    }
  });

  describe("should have well-known native coin", function () {
    const register = prepare(this);

    for (const [id, data] of Object.entries(WellKnownBlockchains)) {
      if ("native-coin" in data) {
        register(`case of ${id}`, function () {
          const cryptoAsset = CryptoRegistryNG.create().createCryptoAsset(
            data["native-coin"],
          );
          assert.exists(cryptoAsset);
        });
      }
    }
  });
});
