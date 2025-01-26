import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import { CryptoResolver } from "../../../src/services/cryptoresolver.mjs";
import { RealTokenResolver } from "../../../src/services/realtoken/realtokenresolver.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { CryptoAsset } from "../../../src/cryptoasset.mjs";

// Test data
import { RealTokenAPI } from "../../../src/services/realtoken/realtokenapi.mjs";
import MockTocken from "../../../fixtures/RealT/token.json" assert { type: "json" };
import MockTockenHistory from "../../../fixtures/RealT/tokenHistory.json" assert { type: "json" };

const FakeRealTokenAPI: RealTokenAPI = {
  async token() {
    return MockTocken;
  },

  async tokenHistory() {
    return MockTockenHistory;
  },
};

describe("RealTokenResolver", function () {
  describe("resolve()", function () {
    describe("should resolve a chain and smart-contract to a token:", function () {
      const register = prepare(this);
      let resolver: CryptoResolver;
      let registry: CryptoRegistry;

      beforeEach(() => {
        registry = CryptoRegistry.create();
        resolver = new RealTokenResolver(FakeRealTokenAPI);
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
