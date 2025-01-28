// Test data
import { RealTokenAPI } from "../../src/services/realtoken/realtokenapi.mjs";
import MockTocken from "../../fixtures/RealT/token.json" assert { type: "json" };
import MockTockenHistory from "../../fixtures/RealT/tokenHistory.json" assert { type: "json" };

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
