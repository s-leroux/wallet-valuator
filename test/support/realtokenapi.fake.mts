// Test data
import { RealTokenAPI } from "../../src/services/realtoken/realtokenapi.mjs";
import MockTocken from "../../fixtures/RealT/token.json" with { type: "json" };
import MockTockenHistory from "../../fixtures/RealT/tokenHistory.json" with { type: "json" };

export class FakeRealTokenAPI implements RealTokenAPI {
  private constructor() {}

  async token() {
    return MockTocken;
  }

  async tokenHistory() {
    return MockTockenHistory;
  }

  static create() {
    return new FakeRealTokenAPI();
  }
}
