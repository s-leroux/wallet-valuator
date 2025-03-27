import {
  CurveAPI,
  CurvePriceHistory,
} from "../../src/services/curve/curveapi.mjs";
import { formatDate } from "../../src/date.mjs";
import { ValueError } from "../../src/error.mjs";

// Test data
import MockPriceHistory from "../../fixtures/Curve/priceHistory.json" assert { type: "json" };

export class FakeCurveAPI implements CurveAPI {
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
    const chains = ["ethereum", "xdai"];

    return {
      data: chains.map((chain) => ({ name: chain })),
    };
  }

  static create(): CurveAPI {
    return new FakeCurveAPI();
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
}
