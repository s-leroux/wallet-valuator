import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import {
  RealTokenMetadata,
  RealTokenResolver,
} from "../../../src/services/realtoken/realtokenresolver.mjs";
import {
  CryptoMetadata,
  CryptoRegistryNG,
} from "../../../src/cryptoregistry.mjs";
import { isCryptoAsset } from "../../../src/cryptoasset.mjs";

// Test data
import { FakeRealTokenAPI } from "../../support/realtokenapi.fake.mjs";
import { asBlockchain } from "../../../src/blockchain.mjs";
import { Swarm } from "../../../src/swarm.mjs";

describe("RealTokenResolver", function () {
  let swarm: Swarm;
  let cryptoRegistry: CryptoRegistryNG;
  let resolver: RealTokenResolver;
  let cryptoMetadata: CryptoMetadata;

  const E = asBlockchain("ethereum");
  const X = asBlockchain("xdai");
  const G = asBlockchain("gnosis");

  beforeEach(() => {
    cryptoRegistry = CryptoRegistryNG.create();
    cryptoMetadata = CryptoMetadata.create();
    resolver = new RealTokenResolver(FakeRealTokenAPI.create());
    swarm = Swarm.create([], cryptoRegistry, cryptoMetadata, resolver);
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
      ] as const;

      for (const [chain, contract] of testcases) {
        register(`case ${chain} ${contract}`, async () => {
          const result = await resolver.resolve(
            swarm,
            cryptoMetadata,
            chain,
            0,
            contract,
            "REALTOKEN-FAKE NAME",
            "REALTOKEN-XYZ",
            18
          );

          if (!result || result.status !== "resolved") {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            assert.fail(`result was ${result}`);
          }
          assert(isCryptoAsset(result.asset));
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
      ] as const;

      for (const [chain, contract, uuid] of testcases) {
        register(`case ${chain} ${contract}`, async () => {
          const result = await resolver.resolve(
            swarm,
            cryptoMetadata,
            chain,
            0,
            contract,
            "REALTOKEN-FAKE NAME",
            "REALTOKEN-XYZ",
            18
          );

          if (!result || result.status !== "resolved") {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            assert.fail(`result was ${result}`);
          }
          const md = cryptoMetadata.getMetadata<RealTokenMetadata>(
            result.asset
          );
          assert.isDefined(md);
          assert.equal(md["realtoken.uuid"], uuid);
        });
      }
    });
  });
});
