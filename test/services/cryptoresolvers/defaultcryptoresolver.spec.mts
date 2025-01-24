import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import { ValueError } from "../../../src/error.mjs";
import { DefaultCryptoResolver } from "../../../src/services/cryptoresolvers/defaultcryptoresolver.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";

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
        register(`case of ${id}`, () => {
          const a = cryptoResolver.get(id);
          const b = cryptoResolver.get(id);

          assert.exists(a);
          assert.strictEqual(a, b);
        });
      }
    });

    describe("should find well known token by chain, block, and address", function () {
      const register = prepare(this);
      const MONERIUM = ["Monerium EUR emoney", "EURe", 18] as const;
      const EURe = "monerium-eur-money";
      // prettier-ignore
      const testcases = [
        ["gnosis", 100, "0xcB444e90D8198415266c6a2724b7900fb12FC56E", EURe ],
        ["gnosis", 100, "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", null ],
        ["gnosis", 30000000, "0xcB444e90D8198415266c6a2724b7900fb12FC56E", EURe ],
        ["gnosis", 30000000, "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", null ],
        ["gnosis", 40000000, "0xcB444e90D8198415266c6a2724b7900fb12FC56E", null ],
        ["gnosis", 40000000, "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", EURe ],
      ] as const;

      for (const [chain, block, address, expected] of testcases) {
        register(`case of ${[chain, block, address]}`, () => {
          const registry = CryptoRegistry.create();
          const result = cryptoResolver.resolve(
            registry,
            chain,
            block,
            address,
            ...MONERIUM
          );
          assert.strictEqual(result, expected && cryptoResolver.get(expected));
        });
      }
    });
  });
});
