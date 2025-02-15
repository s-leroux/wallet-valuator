import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import {
  PhysicalCryptoAsset,
  StaticCryptoResolver,
  LogicalCryptoAsset,
} from "../../../src/services/cryptoresolvers/staticcryptoresolver.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { CryptoAsset } from "../../../src/cryptoasset.mjs";
import { asBlockchain } from "../../../src/blockchain.mjs";

//prettier-ignore
const cryptoTable:PhysicalCryptoAsset[] = [
  ["binance coin", "bnb chain", null],
  ["bitcoin", "bitcoin", null],
  ["dai", "ethereum", "0x6B175474E89094C44Da98b954EedeAC495271d0F", 0, Infinity],
  ["dai", "gnosis", "0x44FA8E6F47987339850636F88629646662444217"],
  ["dai", "polygon", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"],
  ["ethereum", "ethereum", null],
  ["monerium-eure", "ethereum", "0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f", 0, 21419972],
  ["monerium-eure", "ethereum", "0x39b8B6385416f4cA36a20319F70D28621895279D", 21419972, Infinity],
  ["monerium-eure", "gnosis", "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", 35656951, Infinity],
  ["monerium-eure", "gnosis", "0xcB444e90D8198415266c6a2724b7900fb12FC56E", 0, 35656951],
  ["monerium-eure", "polygon", "0x18ec0A6E18E5bc3784fDd3a3634b31245ab704F6", 0, 60733237],
  ["monerium-eure", "polygon", "0xE0aEa583266584DafBB3f9C3211d5588c73fEa8d", 60733237, Infinity],
  ["solana", "solana", null],
  ["usdc", "arbitrum", "0xaf88d065e77c8cc2239327c5edb3a432268e5831"],
  ["usdc", "bnb chain", "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"],
  ["usdc", "ethereum", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
  ["usdc", "gnosis", "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83"],
  ["usdc", "polygon", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"],
  ["usdc", "solana", "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"],
  ["usdt", "ethereum", "0xdAC17F958D2ee523a2206206994597C13D831ec7"],
  ["usdt", "gnosis", "0x4ECaBa5870353805A9F068101A40E0f32ED605C6"],
  ["usdt", "polygon", "0xC2132D05D31c914a87C6611C10748aeb04B58E8F"],
  ["wbtc" , "polygon" ,"0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6"],
  ["wbtc" ,"gnosis", "0x8e5bBbb09Ed1ebd8674Cda39A0c169401db4252"],
  ["wbtc", "arbitrum", "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f"],
  ["wbtc", "bnb chain", "0x0555e30da8f98308edb960aa94c0db47230d2b9c"],
  ["wbtc", "ethereum", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"],
  ["wbtc", "gnosis", "0x8e5bbbb09ed1ebde8674cda39a0c169401db4252"],
  ["wbtc", "polygon", "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6"],
  ["weth", "ethereum", "0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2"],
  ["weth", "gnosis", "0x6a023ccDd60aE47eB5cB7035863e25eDc1ea8287"],
  ["weth", "polygon", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"],
  ["xdai", "gnosis", null],
] as const;

//prettier-ignore
const domainTable: LogicalCryptoAsset[] = [
  ["binance coin", "Binance Coin", "BNB", 18, { STANDARD: { coingeckoId: "binancecoin" } }],
  ["bitcoin", "Bitcoin", "BTC", 8, { STANDARD: { coingeckoId: "bitcoin" } }],
  ["dai", "Dai Stablecoin", "DAI", 18, { STANDARD: { coingeckoId: "dai" } }],
  ["ethereum", "Ethereum", "ETH", 18, { STANDARD: { coingeckoId: "ethereum" } }],
  ["monerium-eure","Monerium EURe", "EURе", 18, { STANDARD: { coingeckoId: "monerium-eur-money" } }],
  ["solana", "Solana", "SOL", 9, { STANDARD: { coingeckoId: "solana" } }],
  ["usdc", "USD Coin", "USDC", 6, { STANDARD: { coingeckoId: "usd-coin" } }],
  ["usdt", "Tether USD", "USDT", 6, { STANDARD: { coingeckoId: "tether" } }],
  ["wbtc","Wrapped Bitcoin","WBTC" ,8 , { STANDARD: { coingeckoId: "wrapped-bitcoin" } }],
  ["weth", "Wrapped Ether", "WETH", 18, { STANDARD: { coingeckoId: "weth" } }],
  ["xdai", "xDai", "xDAI", 18 , { STANDARD: { coingeckoId: "xdai" } }],
] as const;

describe("StaticCryptoResolver", function () {
  let cryptoResolver: StaticCryptoResolver;

  beforeEach(() => {
    cryptoResolver = StaticCryptoResolver.create(cryptoTable, domainTable);
  });

  describe("default database", function () {
    const E = asBlockchain("ethereum");
    const G = asBlockchain("gnosis");
    const P = asBlockchain("polygon");
    const S = asBlockchain("solana");
    const B = asBlockchain("bitcoin");

    describe("should find well known token by chain, block, and address", function () {
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
          if (!result || result.status !== "resolved") {
            assert.fail(`result was ${result}`);
          }
          assert.strictEqual(result.asset, cryptoResolver.get("usdc"));
        });
      }
    });

    describe("should honor the [start, end) validity block range", function () {
      const register = prepare(this);
      const EURe = ["Monerium EURe", "EURe", 18] as const;
      const G_V1 = "0xcB444e90D8198415266c6a2724b7900fb12FC56E";
      const G_V2 = "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430";

      // prettier-ignore
      const testcases = [
        [G, G_V1, 35656950, ...EURe, "V1, before update", "resolved"],
        [G, G_V1, 35656951, ...EURe, "V1, after update", "obsolete"],
        [G, G_V2, 35656950, ...EURe, "V2, before update", "obsolete"],
        [G, G_V2, 35656951, ...EURe, "V2, after update", "resolved"],
      ] as const;

      for (const [
        chain,
        address,
        block,
        name,
        symbol,
        decimal,
        desc,
        expected,
      ] of testcases) {
        register(`case of ${[chain, name]} ${desc}`, async () => {
          const registry = CryptoRegistry.create();
          const result = await cryptoResolver.resolve(
            registry,
            chain,
            block,
            address,
            name,
            symbol,
            decimal
          );
          assert.exists(result);
          assert.equal(result?.status, expected);
        });
      }
    });

    it("should return consistent result across chains", async function () {
      const USDC = ["USD Coin", "USDC", 6] as const;
      const coingeckoId = {
        USDC: "usd-coin",
      };

      // prettier-ignore
      const testcases = [
        [G, "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83", ...USDC ],
        [P, "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", ...USDC ],
        [E, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", ...USDC ],
      ] as const;

      const registry = CryptoRegistry.create();
      let first: CryptoAsset | undefined;

      for (const [chain, address, name, symbol, decimal] of testcases) {
        const result = await cryptoResolver.resolve(
          registry,
          chain,
          12345,
          address,
          name,
          symbol,
          decimal
        );
        if (!result || result.status !== "resolved") {
          assert.fail(`result was ${result}`);
        }
        assert.include(registry.getDomainData(result.asset, "STANDARD"), {
          coingeckoId: coingeckoId.USDC,
        });
        if (first) {
          assert.strictEqual(result.asset, first);
        } else {
          first = result.asset;
        }
      }
    });

    it("should register metadata", async function () {
      const USDC = ["USD Coin", "USDC", 6] as const;

      // prettier-ignore
      const testcase = [B,null, "Bitcoin", "BTC", 8] as const

      const registry = CryptoRegistry.create();
      const [chain, address, name, symbol, decimal] = testcase;
      const result = await cryptoResolver.resolve(
        registry,
        chain,
        12345,
        address,
        name,
        symbol,
        decimal
      );
      if (!result || result.status !== "resolved") {
        assert.fail(`result was ${result}`);
      }

      assert.deepEqual(registry.getDomainData(result.asset, "STANDARD"), {
        coingeckoId: "bitcoin",
      });
    });
  });
});
