import { assert } from "chai";

import { Blockchain } from "../src/blockchain.mjs";
import { WellKnownBlockchains } from "../src/data/wellknownblockchains.mjs";
import { CryptoRegistryNG } from "../src/cryptoregistry.mjs";
import { prepare } from "./support/register.helper.mjs";
import { WellKnownCryptoAssets } from "../src/data/wellknowncryptoassets.mjs";

//======================================================================
//  Well-known data validation
//======================================================================

/**
 * @module WellKnownData
 *
 * This module validates the well-known data, focusing on schema conformance and referential integrity.
 *
 * Conceptually, this module provides the schema definition and and enforces integrity constraints
 * just as an RDBMS would.
 *
 * We do NOT test here the corresponding data objects (Blockchain, CryptoAsset, etc.). Each of these has
 * its own test suite.
 *
 */

describe("Well-known data", function () {
  describe("Well-known crypto-assets", function () {
    it("should have unique internal id", function () {
      // build a set from the `WellKnownCryptoAssets.internalId` and check
      // that the set has the same length as the array
      const internalIds = new Set(
        WellKnownCryptoAssets.map(([internalId]) => internalId),
      );
      assert.strictEqual(internalIds.size, WellKnownCryptoAssets.length);
    });
  });

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

    describe("EVM-compatible blockchains must have a `chainid`", function () {
      const register = prepare(this);
      for (const [id, data] of Object.entries(WellKnownBlockchains)) {
        if (data.type === "evm") {
          register(`case of ${id}`, function () {
            assert.isNumber(data["explorer-options"]?.chainid);
          });
        }
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
});
