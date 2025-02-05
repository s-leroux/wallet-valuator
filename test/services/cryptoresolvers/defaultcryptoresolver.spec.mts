import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import { ValueError } from "../../../src/error.mjs";
import { DefaultCryptoResolver } from "../../../src/services/cryptoresolvers/defaultcryptoresolver.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { asBlockchain } from "../../../src/blockchain.mjs";

describe("DefaultCryptoResolver", function () {
  it("can be created (no parameters)", function () {
    const cryptoResolver = new DefaultCryptoResolver();
  });

  describe("default database", function () {
    let cryptoResolver = new DefaultCryptoResolver();

    afterEach(() => {
      cryptoResolver = new DefaultCryptoResolver();
    });

    describe("should find well known crypto-currencies by their id", function () {
      const register = prepare(this);
      const testcases = ["bitcoin", "ethereum"];
      for (const id of testcases) {
        register(`case of ${id}`, async () => {
          const a = await cryptoResolver.get(id);
          const b = await cryptoResolver.get(id);

          assert.exists(a);
          assert.strictEqual(a, b);
        });
      }
    });

    describe("should find well known token by chain, block, and address", function () {
      const register = prepare(this);
      const MONERIUM = ["Monerium EUR emoney", "EURe", 18] as const;
      const EURe = "monerium-eur-money";
      const G = asBlockchain("gnosis");

      // prettier-ignore
      const testcases = [
        [G, 100, "0xcB444e90D8198415266c6a2724b7900fb12FC56E", EURe ],
        [G, 100, "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", null ],
        [G, 30000000, "0xcB444e90D8198415266c6a2724b7900fb12FC56E", EURe ],
        [G, 30000000, "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", null ],
        [G, 40000000, "0xcB444e90D8198415266c6a2724b7900fb12FC56E", null ],
        [G, 40000000, "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", EURe ],
      ] as const;

      for (const [chain, block, address, expected] of testcases) {
        register(`case of ${[chain, block, address]}`, async () => {
          const registry = CryptoRegistry.create();
          const result = await cryptoResolver.resolve(
            registry,
            chain,
            block,
            address,
            ...MONERIUM
          );
          assert.strictEqual(
            result,
            expected && (await cryptoResolver.get(expected))
          );
        });
      }
    });
  });
});
