import {
  CurveAPI,
  CurveChainList,
  CurveOHLC,
  CurvePriceHistory,
  CurvePriceList,
  ToCurveChainName,
} from "../../src/services/curve/curveapi.mjs";
import { formatDate } from "../../src/date.mjs";
import { NotImplementedError } from "../../src/error.mjs";

// Test data
import MockPriceHistory from "../../fixtures/Curve/prices/priceHistory.json" with { type: "json" };
import MockUSDPriceEthereum from "../../fixtures/Curve/prices/usd_price/ethereum.json" with { type: "json" };
import MockUSDPriceGnosis from "../../fixtures/Curve/prices/usd_price/gnosis.json" with { type: "json" };
import { findLiquidityPool } from "../../src/services/curve/curvedb.mjs";

export class FakeCurveAPI implements CurveAPI {
  static create(): CurveAPI {
    return new FakeCurveAPI();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getUSDPrice(
    chain: string,
    tokenAddress: string,
    date: Date
  ): Promise<CurvePriceHistory> {
    const dateString = formatDate("YYYY-MM-DDT00:00:00", date);
    const data = [];
    if (tokenAddress.toLowerCase() === MockPriceHistory.address.toLowerCase()) {
      const price = MockPriceHistory.data.find(
        (value) => value.timestamp === dateString
      );
      if (price) {
        data.push(price);
      }
    }

    return {
      address: tokenAddress,
      data,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getChains() {
    return {
      __proto__: null,

      data: [
        {
          name: "ethereum",
        },
        {
          name: "gnosis", // Originaly it is xdai but the library makes the update transparent
        },
      ],
    } as CurveChainList;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getChainContracts(chainName: string) {
    return {
      chain: chainName,
      data: [
        {
          name: "3pool",
          address: "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7",
        },
        {
          name: "aave",
          address: "0xdebf20617708857ebe4f679508e7b7863a8a8eee",
        },
      ],
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getAllUSDPrices(chain: string): Promise<CurvePriceList> {
    switch (chain) {
      case "ethereum":
        return MockUSDPriceEthereum;
      case "gnosis":
        return MockUSDPriceGnosis;
    }

    throw new NotImplementedError(`Unsupported chain ${chain}`);
  }

  getLiquidityPoolOHLC(
    chainName: string,
    poolAddress: string,
    date: Date
  ): Promise<CurveOHLC> {
    throw new NotImplementedError("Method not implemented.");
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getLiquidityPoolFromToken(
    chainName: string,
    tokenAddress: string
  ): Promise<string | null> {
    chainName = ToCurveChainName[chainName] ?? chainName;

    return findLiquidityPool(chainName, tokenAddress);
  }
}
