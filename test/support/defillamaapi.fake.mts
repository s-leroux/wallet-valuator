import { formatDate } from "../../src/date.mjs";
import { NotImplementedError } from "../../src/error.mjs";

// Test data
import MockPriceHistory from "../../fixtures/DefiLlama/prices/historical/2023-10-01/coingecko:bitcoin.json" assert { type: "json" };
import {
  DefiLlamaAPI,
  DefiLlamaPriceData,
} from "../../src/services/defillama/defillamaapi.mjs";

export class FakeDefiLlamaAPI implements DefiLlamaAPI {
  static create(): DefiLlamaAPI {
    return new FakeDefiLlamaAPI();
  }

  async getHistoricalPrices(
    date: Date,
    coins: string[]
  ): Promise<DefiLlamaPriceData> {
    switch (formatDate("YYYY-MM-DD", date)) {
      case "2023-10-01":
        return MockPriceHistory;
      default:
        throw new NotImplementedError();
    }
  }
}
