import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import { LazyCryptoResolver } from "../../../src/services/cryptoresolvers/lazycryptoresolver.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { CryptoAsset } from "../../../src/cryptoasset.mjs";
import { asBlockchain } from "../../../src/blockchain.mjs";

describe("LazyCryptoResolver", function () {
  let cryptoResolver: LazyCryptoResolver;

  const E = asBlockchain("ethereum");
  const G = asBlockchain("gnosis");
  const P = asBlockchain("polygon");
  const S = asBlockchain("solana");

  beforeEach(() => {
    cryptoResolver = LazyCryptoResolver.create();
  });

  it("Should cache tokens", async () => {
    const registry = CryptoRegistry.create();
    const POLYGON_WBTC = [
      "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      "Wrapped Bitcoin",
      "WBTC",
      8,
    ] as const;

    assert.notExists(await cryptoResolver.get("polygon", POLYGON_WBTC[0]));
    const wbtc = await cryptoResolver.resolve(
      registry,
      P,
      1234,
      ...POLYGON_WBTC
    );
    assert.exists(wbtc);
    assert.deepEqual(
      [wbtc.name, wbtc.symbol, wbtc.decimal],
      POLYGON_WBTC.slice(1)
    );
    assert.strictEqual(
      await cryptoResolver.get("polygon", POLYGON_WBTC[0]),
      wbtc
    );
    const wbtc2 = await cryptoResolver.resolve(
      registry,
      P,
      1234,
      ...POLYGON_WBTC
    );
    assert.strictEqual(wbtc2, wbtc);
  });

  describe("should create any token on demand", function () {
    const register = prepare(this);
    const USDC = ["USD Coin", "USDC", 6] as const;

    // prettier-ignore
    const testcases = [
        [G, "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83", ...USDC ],
        [P, "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", ...USDC ],
        [E, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", ...USDC ],
        [S, "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", ...USDC ],
      ] as const;

    for (const [chain, address, name, symbol, decimal] of testcases) {
      register(`case of ${[chain, name]}`, async () => {
        const registry = CryptoRegistry.create();
        const result = await cryptoResolver.resolve(
          registry,
          chain,
          12345,
          address,
          name,
          symbol,
          decimal
        );
        assert.exists(result);
        assert.deepEqual(
          [result.name, result.symbol, result.decimal],
          [name, symbol, decimal]
        );
      });
    }
  });
});
