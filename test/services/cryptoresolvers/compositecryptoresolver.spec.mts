import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import type { CryptoResolver } from "../../../src/services/cryptoresolver.mjs";
import {
  EthereumCryptoResolver,
  GnosisCryptoResolver,
} from "../../support/cryptoresolver.fake.mjs";
import { LazyCryptoResolver } from "../../../src/services/cryptoresolvers/lazycryptoresolver.mjs";
import { CompositeCryptoResolver } from "../../../src/services/cryptoresolvers/compositecryptoresolver.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { CryptoAsset } from "../../../src/cryptoasset.mjs";
import { asBlockchain } from "../../../src/blockchain.mjs";

describe("CompositeCryptoResolver", function () {
  let registry: CryptoRegistry;
  let lazy: CryptoResolver;
  let gnosis: CryptoResolver;
  let ethereum: CryptoResolver;
  let composite: CryptoResolver;

  beforeEach(() => {
    registry = CryptoRegistry.create();
    lazy = LazyCryptoResolver.create();
    gnosis = GnosisCryptoResolver.create();
    ethereum = EthereumCryptoResolver.create();
    composite = CompositeCryptoResolver.create([gnosis, ethereum, lazy]);
  });

  describe("should forward to the backends", function () {
    const register = prepare(this);
    // prettier-ignore
    const USDC = [ "USDC", "USDC", 6] as const;
    const testcases = [
      ["gnosis", "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83"],
      ["ethereum", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
      ["solana", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
    ] as const;

    for (const [chain, sc] of testcases) {
      register(`case ${chain} ${sc}`, async () => {
        const resolvers = {
          __proto__: null,

          gnosis,
          ethereum,
          solana: lazy,
        };

        const result = await composite.resolve(
          registry,
          asBlockchain(chain),
          12345,
          sc,
          ...USDC
        );

        assert.exists(result);

        const ref = await resolvers[chain].resolve(
          registry,
          asBlockchain(chain),
          12345,
          sc,
          ...USDC
        );

        assert.strictEqual(result, ref);
      });
    }
  });
});
