import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import { LazyCryptoResolver } from "../../../src/services/cryptoresolvers/lazycryptoresolver.mjs";
import {
  CryptoRegistryNG,
  CryptoMetadata,
} from "../../../src/cryptoregistry.mjs";
import { asBlockchain } from "../../../src/blockchain.mjs";
import { Swarm } from "../../../src/swarm.mjs";

describe("LazyCryptoResolver", function () {
  let cryptoResolver: LazyCryptoResolver;
  let cryptoRegistry: CryptoRegistryNG;
  let cryptoMetadata: CryptoMetadata;
  let swarm: Swarm;

  const E = asBlockchain("ethereum");
  const G = asBlockchain("gnosis");
  const P = asBlockchain("polygon");
  const S = asBlockchain("solana");

  beforeEach(() => {
    cryptoRegistry = CryptoRegistryNG.create();
    cryptoMetadata = CryptoMetadata.create();
    cryptoResolver = LazyCryptoResolver.create();
    swarm = Swarm.create([], cryptoRegistry, cryptoMetadata, cryptoResolver);
  });

  it("Should cache tokens", async () => {
    const POLYGON_WBTC = [
      "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      "Wrapped Bitcoin",
      "WBTC",
      8,
    ] as const;

    assert.throws(() => cryptoResolver.get("polygon", POLYGON_WBTC[0]));
    const wbtc = await cryptoResolver.resolve(
      swarm,
      cryptoMetadata,
      P,
      1234,
      ...POLYGON_WBTC
    );
    if (!wbtc || wbtc.status !== "resolved") {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      assert.fail(`wbtc was ${wbtc}`);
    }
    assert.include(wbtc.asset, {
      name: POLYGON_WBTC[1],
      symbol: POLYGON_WBTC[2],
      decimal: POLYGON_WBTC[3],
    });
    assert.strictEqual(
      cryptoResolver.get("polygon", POLYGON_WBTC[0]),
      wbtc.asset
    );
    const wbtc2 = await cryptoResolver.resolve(
      swarm,
      cryptoMetadata,
      P,
      1234,
      ...POLYGON_WBTC
    );
    assert.deepEqual(wbtc2, wbtc);
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
        const result = await cryptoResolver.resolve(
          swarm,
          cryptoMetadata,
          chain,
          12345,
          address,
          name,
          symbol,
          decimal
        );
        if (!result || result.status !== "resolved") {
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          assert.fail(`result was ${result}`);
        }
        assert.include(result.asset, { name, symbol, decimal });
      });
    }
  });
});
