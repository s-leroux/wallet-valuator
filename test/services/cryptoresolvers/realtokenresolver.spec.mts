import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import { ValueError } from "../../../src/error.mjs";
import { CryptoResolver } from "../../../src/services/cryptoresolver.mjs";
import {
  RealTokenResolver,
  RealTokenProvider,
  RealTokenAPI,
} from "../../../src/services/cryptoresolvers/realtokenresolver.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { CryptoAsset } from "../../../src/cryptoasset.mjs";

// Test data
import MockTocken from "../../../fixtures/RealT/token.json" assert { type: "json" };
import MockTockenHistory from "../../../fixtures/RealT/tokenHistory.json" assert { type: "json" };

const MOCHA_TEST_TIMEOUT = 4000;

const FakeTokenAPI = {
  async token() {
    return MockTocken;
  },

  async tokenHistory() {
    return MockTockenHistory;
  },
};

describe("RealTokenAPI", function () {
  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT / 2);

  describe("token()", function () {
    it("should return a list of token:", async function () {
      const provider = new RealTokenProvider();
      const api = new RealTokenAPI(provider);

      const actual = await api.token();

      assert.isTrue(Array.isArray(actual), `${actual} should be an array`);
      for (const item of actual) {
        assert.containsAllKeys(item, [
          "fullName",
          "shortName",
          "symbol",
          "productType",
          "tokenPrice",
          "currency",
          "uuid",
          "ethereumContract",
          "xDaiContract",
          "gnosisContract",
        ]);
      }
    });
  });
});

describe("RealTokenResolver", function () {
  describe("resolve()", function () {
    describe("should resolve a chain and smart-contract to a token:", function () {
      const register = prepare(this);
      let resolver: CryptoResolver;
      let registry: CryptoRegistry;

      beforeEach(() => {
        registry = CryptoRegistry.create();
        resolver = new RealTokenResolver(FakeTokenAPI);
      });

      const E = "ethereum";
      const X = "xdai";
      const G = "gnosis";

      // prettier-ignore
      const testcases = [
        [E, "0x6Fd016CCc4611F7BAB1DD3267334cB0216Ef47f9", "REALTOKEN-8342-SCHAEFER-HWY-DETROIT-MI"],

        [E, "0xFe17C3C0B6F38cF3bD8bA872bEE7a18Ab16b43fB", "REALTOKEN-S-15777-ARDMORE-ST-DETROIT-MI"],
        [X, "0xFe17C3C0B6F38cF3bD8bA872bEE7a18Ab16b43fB", "REALTOKEN-S-15777-ARDMORE-ST-DETROIT-MI"],
        [G, "0xFe17C3C0B6F38cF3bD8bA872bEE7a18Ab16b43fB", "REALTOKEN-S-15777-ARDMORE-ST-DETROIT-MI"],
      ] as const

      for (const [chain, contract, symbol] of testcases) {
        register(`case ${chain} ${contract}`, async () => {
          const crypto = await resolver.resolve(
            registry,
            chain,
            0,
            contract,
            "REALTOKEN-FAKE NAME",
            "REALTOKEN-XYZ",
            18
          );

          assert.instanceOf(crypto, CryptoAsset);
        });
      }
    });
  });
});
