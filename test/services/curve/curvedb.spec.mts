import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";
import { findLiquidityPool } from "../../../src/services/curve/curvedb.mjs";

const ETH = "ethereum";
const XDA = "xdai"; // The curvedb code is very low-level an must probably use the Curve identifiers

describe("CurveDB utilities", () => {
  describe("findLiquidityPool()", () => {
    // prettier-ignore
    const TESTCASES : [chainName: string, poolAddress: string, lpTokenAddress: string, gaugeAddress: string|null, name:string][] = [
      [ XDA, "0x7f90122BF0700F9E7e1F688fe926940E8839F353", "0x1337BedC9D22ecbe766dF105c9623922A27963EC", "0xB721Cc32160Ab0da2614CC6aB16eD822Aeebc101", "3pool"],
      [ XDA, "0x056C6C5e684CeC248635eD86033378Cc444459B0", "0x0CA1C1eC4EBf3CC67a9f545fF90a3795b318cA4a", "0xd91770E868c7471a9585d1819143063A40c54D00", "eureusd"],
      [ XDA, "0x845C8bc94610807fCbaB5dd2bc7aC9DAbaFf3c55", "0x845C8bc94610807fCbaB5dd2bc7aC9DAbaFf3c55", null, "EURe/EURC"],
      [ XDA, "0x14875ba4DD25d985876074C5ca6F9DcbCa20C80e", "0x14875ba4DD25d985876074C5ca6F9DcbCa20C80e", null, "wXDAI/USDC/crvUSD"],

      [ ETH, "0xAb96AA0ee764924f49fbB372f3B4db9c2cB24Ea2", "0xAb96AA0ee764924f49fbB372f3B4db9c2cB24Ea2", null, "USDLxUSDC"],
      [ ETH, "0x02950460E2b9529D0E00284A5fA2d7bDF3fA4d72", "0x02950460E2b9529D0E00284A5fA2d7bDF3fA4d72", "0x04E80Db3f84873e4132B221831af1045D27f140F", "USDe-USDC"],
      [ ETH, "0x4DEcE678ceceb27446b35C672dC7d61F30bAD69E", "0x4DEcE678ceceb27446b35C672dC7d61F30bAD69E", "0x95f00391cB5EebCd190EB58728B4CE23DbFa6ac1", "crvUSD/USDC"],
      [ ETH, "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", "0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A", "3pool"],
    ];

    describe("should retrieve a pool by its LP token address", function () {
      const register = prepare(this);

      for (const testcase of TESTCASES) {
        // prettier-ignore
        const [ chainName, poolAddress, lpTokenAddress, , poolName] = testcase;
        register(`case ${poolName} on ${chainName}`, () => {
          assert.equal(
            findLiquidityPool(chainName, lpTokenAddress),
            poolAddress
          );
        });
      }
    });

    describe("should retrieve a pool by its gauge address", function () {
      const register = prepare(this);

      for (const testcase of TESTCASES) {
        // prettier-ignore
        const [ chainName, poolAddress, , gaugeAddress, poolName] = testcase;
        if (gaugeAddress) {
          register(`case ${poolName} on ${chainName}`, () => {
            assert.equal(
              findLiquidityPool(chainName, gaugeAddress),
              poolAddress
            );
          });
        }
      }
    });

    describe("should return null for non-Curve blockchain identifiers", function () {
      const register = prepare(this);

      register(`case 'gnosis' as chain name should not resolve`, () => {
        // ─────────────────────────────────────────────────────────────────────────────
        // This test ensures that the internal utility function `findLiquidityPool`
        // only recognizes the blockchain identifiers exactly as defined by the Curve
        // API — notably, "xdai" for the Gnosis Chain — and not the modern
        // application-level name "gnosis".
        //
        // This reinforces separation of concerns: conversions like "gnosis" → "xdai"
        // should happen upstream, in higher-level abstractions like CurveAPI.
        // ─────────────────────────────────────────────────────────────────────────────
        const result = findLiquidityPool(
          "gnosis",
          "0xB721Cc32160Ab0da2614CC6aB16eD822Aeebc101"
        );
        assert.isNull(
          result,
          "Expected 'gnosis' to be unrecognized at this low-level"
        );
      });
    });
  });
});
