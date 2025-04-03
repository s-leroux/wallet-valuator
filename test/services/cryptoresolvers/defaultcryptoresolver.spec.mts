import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import { DefaultCryptoResolver } from "../../../src/services/cryptoresolvers/defaultcryptoresolver.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { asBlockchain } from "../../../src/blockchain.mjs";
import { ResolutionResult } from "../../../src/services/cryptoresolver.mjs";
import { Swarm } from "../../../src/swarm.mjs";
import { toCryptoAssetID } from "../../../src/cryptoasset.mjs";

describe("DefaultCryptoResolver", function () {
  it("can be created (no parameters)", function () {
    const cryptoResolver = DefaultCryptoResolver.create();
    assert.exists(cryptoResolver);
  });

  describe("default database", function () {
    let cryptoResolver: DefaultCryptoResolver;
    let registry: CryptoRegistry;
    let swarm: Swarm;

    beforeEach(() => {
      cryptoResolver = DefaultCryptoResolver.create();
      registry = CryptoRegistry.create();
      swarm = Swarm.create([], registry, cryptoResolver);
    });

    describe("should find well known token by chain, block, and address", function () {
      const register = prepare(this);
      const MONERIUM = ["Monerium EUR emoney", "EURe", 18] as const;
      const EURe = "monerium-eure";
      const G = asBlockchain("gnosis");
      const OBSOLETE = Symbol("obsolete");

      type Resolved = Extract<ResolutionResult, { status: "resolved" }>;

      // prettier-ignore
      const testcases = [
        [G, 100, "0xcB444e90D8198415266c6a2724b7900fb12FC56E", EURe ],
        [G, 100, "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", OBSOLETE ],
        [G, 30000000, "0xcB444e90D8198415266c6a2724b7900fb12FC56E", EURe ],
        [G, 30000000, "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", OBSOLETE ],
        [G, 40000000, "0xcB444e90D8198415266c6a2724b7900fb12FC56E", OBSOLETE ],
        [G, 40000000, "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", EURe ],
      ] as const;

      for (const [chain, block, address, expected] of testcases) {
        register(`case of ${[chain, block, address]}`, async () => {
          const registry = CryptoRegistry.create();
          const result = await cryptoResolver.resolve(
            swarm,
            chain,
            block,
            address,
            ...MONERIUM
          );
          assert.exists(result);
          switch (expected) {
            case OBSOLETE:
              assert.deepEqual(result, { status: "obsolete" });
              break;
            default:
              assert.include(result, { status: "resolved" });
              assert.equal(
                (result as Resolved).asset.id,
                toCryptoAssetID(expected)
              );
          }
        });
      }
    });
  });
});
