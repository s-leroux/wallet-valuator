import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import { CryptoResolver } from "../../../src/services/cryptoresolver.mjs";
import { RealTokenResolver } from "../../../src/services/realtoken/realtokenresolver.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { CryptoAsset } from "../../../src/cryptoasset.mjs";

// Test data
import { FakeRealTokenAPI } from "../../support/realtokenapi.fake.mjs";
import { asBlockchain } from "../../../src/blockchain.mjs";
import { Swarm } from "../../../src/swarm.mjs";

describe("RealTokenResolver", function () {
  let resolver: CryptoResolver;
  let registry: CryptoRegistry;
  let swarm: Swarm;

  const E = asBlockchain("ethereum");
  const X = asBlockchain("xdai");
  const G = asBlockchain("gnosis");

  beforeEach(() => {
    resolver = new RealTokenResolver(FakeRealTokenAPI.create());
    registry = CryptoRegistry.create();
    swarm = Swarm.create([], registry, resolver);
  });

  describe("resolve()", function () {
    describe("should resolve a chain and smart-contract to a logical token:", function () {
      const register = prepare(this);

      // prettier-ignore
      const testcases = [
        [E, "0x6Fd016CCc4611F7BAB1DD3267334cB0216Ef47f9", "REALTOKEN-8342-SCHAEFER-HWY-DETROIT-MI"],

        [E, "0xFe17C3C0B6F38cF3bD8bA872bEE7a18Ab16b43fB", "REALTOKEN-S-15777-ARDMORE-ST-DETROIT-MI"],
        [X, "0xFe17C3C0B6F38cF3bD8bA872bEE7a18Ab16b43fB", "REALTOKEN-S-15777-ARDMORE-ST-DETROIT-MI"],
        [G, "0xFe17C3C0B6F38cF3bD8bA872bEE7a18Ab16b43fB", "REALTOKEN-S-15777-ARDMORE-ST-DETROIT-MI"],
      ] as const

      for (const [chain, contract, symbol] of testcases) {
        register(`case ${chain} ${contract}`, async () => {
          const result = await resolver.resolve(
            swarm,
            chain,
            0,
            contract,
            "REALTOKEN-FAKE NAME",
            "REALTOKEN-XYZ",
            18
          );

          if (!result || result.status !== "resolved") {
            assert.fail(`result was ${result}`);
          }
          assert.instanceOf(result.asset, CryptoAsset);
        });
      }
    });

    describe("should populate the crypto registry metadata", function () {
      const register = prepare(this);

      // prettier-ignore
      const testcases = [
        [E, "0x6Fd016CCc4611F7BAB1DD3267334cB0216Ef47f9", "0x6Fd016CCc4611F7BAB1DD3267334cB0216Ef47f9"],

        [E, "0xFe17C3C0B6F38cF3bD8bA872bEE7a18Ab16b43fB", "0xFe17C3C0B6F38cF3bD8bA872bEE7a18Ab16b43fB"],
        [X, "0xFe17C3C0B6F38cF3bD8bA872bEE7a18Ab16b43fB", "0xFe17C3C0B6F38cF3bD8bA872bEE7a18Ab16b43fB"],
        [G, "0xFe17C3C0B6F38cF3bD8bA872bEE7a18Ab16b43fB", "0xFe17C3C0B6F38cF3bD8bA872bEE7a18Ab16b43fB"],
      ] as const

      for (const [chain, contract, uuid] of testcases) {
        register(`case ${chain} ${contract}`, async () => {
          const result = await resolver.resolve(
            swarm,
            chain,
            0,
            contract,
            "REALTOKEN-FAKE NAME",
            "REALTOKEN-XYZ",
            18
          );

          if (!result || result.status !== "resolved")
            assert.fail(`result was ${result}`);
          const metadata = swarm.registry.getNamespaceData(
            result.asset,
            "REALTOKEN"
          );
          assert.isDefined(metadata);
          assert.equal(metadata.uuid, uuid);
        });
      }
    });
  });
});
