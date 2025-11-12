// Test data
import {
  RealToken,
  RealTokenAPI,
} from "../../src/services/realtoken/realtokenapi.mjs";
import MockToken from "../../fixtures/RealT/token.json" with { type: "json" };
import MockTokenByUuid from "../../fixtures/RealT/token/0x32985d23da2d34c41113a734b20d87ce40ef734d.json" with { type: "json" };
import MockTokenHistory from "../../fixtures/RealT/tokenHistory.json" with { type: "json" };

export class FakeRealTokenAPI implements RealTokenAPI {
  private constructor() {}

  async token() {
    return MockToken;
  }

  async tokenByUuid(uuid: string): Promise<RealToken> {
    if (uuid.toLowerCase() !== "0x32985d23da2d34c41113a734b20d87ce40ef734d")
      throw new Error("Method not implemented.");

    return MockTokenByUuid;
  }

  async tokenHistory() {
    return MockTokenHistory;
  }

  static create() {
    return new FakeRealTokenAPI();
  }
}
