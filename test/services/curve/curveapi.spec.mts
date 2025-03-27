import { assert } from "chai";

import {
  DefaultCurveAPI,
  CurveProvider,
  CurveAPI,
} from "../../../src/services/curve/curveapi.mjs";

import { prepare } from "../../support/register.helper.mjs";

const MOCHA_TEST_TIMEOUT = 10000;
const ETH = "ethereum";
const GNO = "gnosis";

// prettier-ignore
const TESTCASES: [
  chain: string,
  poolAddress: string,
  tokenAddress: string,
  poolName: string
][] =
  [
  [ ETH, "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", "3pool" ],
  [ GNO, "0x7f90122BF0700F9E7e1F688fe926940E8839F353", "0x1337BedC9D22ecbe766dF105c9623922A27963EC", "3pool" ],
] as const;

describe("DefaultCurveAPI", function () {
  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT / 2);

  let provider: CurveProvider;
  let api: CurveAPI;

  beforeEach(() => {
    provider = new CurveProvider();
    api = new DefaultCurveAPI(provider);
  });

  describe("getPrice()", function () {
    it("should return the price of a token", async function () {
      const CHAIN = "ethereum";
      const TOKEN = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6e490";
      const DATE = "2025-03-02";
      const EXPECTED = {
        address: TOKEN,
        data: [
          {
            price: 1.0397308967364005,
            timestamp: `${DATE}T00:00:00`,
          },
        ],
      };

      const result = await api.getUSDPrice(CHAIN, TOKEN, new Date(DATE));

      assert.deepEqual(result, EXPECTED);
    });
  });

  describe("getAllUSDPrices()", function () {
    describe("should return the liquidity pool's token address", async function () {
      const register = prepare(this);

      for (const [chain, , tokenAddress, poolName] of TESTCASES) {
        register(`case ${chain} ${poolName}`, async () => {
          const result = await api.getAllUSDPrices(chain);
          assert.isArray(result.data);
          assert(result.data.find((item) => item.address === tokenAddress));
        });
      }
    });
  });

  describe("getChains()", function () {
    it("should return all the supported chains", async function () {
      const result = await api.getChains();

      assert.isArray(result.data);
      assert(result.data.find((chain) => chain.name === "ethereum"));
      assert(result.data.find((chain) => chain.name === "gnosis"));
    });
  });

  describe("getChainContracts()", function () {
    it("should return all contracts for a chain", async function () {
      this.timeout(10 * MOCHA_TEST_TIMEOUT);

      const chainName = "ethereum";
      const result = await api.getChainContracts(chainName);
      assert.equal(result.chain, chainName);
      assert.isArray(result.data);

      // Pool contract address for '3pool' on Ethereum.
      // It is NOT the token address!
      const CONTRACT = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
      assert(result.data.find((item) => item.address == CONTRACT));
    });
  });
});
