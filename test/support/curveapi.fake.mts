import {
  CurveAPI,
  CurveChainList,
  CurveOHLC,
  CurvePriceHistory,
  CurvePriceList,
} from "../../src/services/curve/curveapi.mjs";
import { formatDate } from "../../src/date.mjs";
import { NotImplementedError, ValueError } from "../../src/error.mjs";

// Test data
import MockPriceHistory from "../../fixtures/Curve/prices/priceHistory.json" assert { type: "json" };
import MockUSDPriceEthereum from "../../fixtures/Curve/prices/usd_price/ethereum.json" assert { type: "json" };
import MockUSDPriceGnosis from "../../fixtures/Curve/prices/usd_price/gnosis.json" assert { type: "json" };

export class FakeCurveAPI implements CurveAPI {
  static create(): CurveAPI {
    return new FakeCurveAPI();
  }

  async getUSDPrice(
    chain: string,
    tokenAddress: string,
    date: Date
  ): Promise<CurvePriceHistory> {
    const dateString = formatDate("YYYY-MM-DDT00:00:00", date);
    if (tokenAddress.toLowerCase() === MockPriceHistory.address.toLowerCase()) {
      const price = MockPriceHistory.data.find(
        (value) => value.timestamp === dateString
      );
      if (price) {
        return {
          address: tokenAddress,
          data: [price],
        };
      }
    }

    throw new ValueError(`No data for ${tokenAddress} at ${dateString}`);
  }

  async getChains() {
    return {
      __proto__: null,

      data: [
        {
          name: "ethereum",
        },
        {
          name: "gnosis",
        },
      ],
    } as CurveChainList;
  }

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
}
