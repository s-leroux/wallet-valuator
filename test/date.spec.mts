import { assert } from "chai";

import { formatDate } from "../src/date.mjs";

const END_OF_YEAR = 1735689599; // timestamp for 2024-12-31 23:59:59

describe("Date utilities", () => {
  describe("formatDate()", () => {
    it("should format date as DD-MM-YYYY UTC", () => {
      const testcases: [number, string][] = [
        [END_OF_YEAR, "31-12-2024"],
        [END_OF_YEAR + 1, "01-01-2025"],
      ];

      for (const [timestamp, expected] of testcases) {
        assert.equal(
          formatDate("DD-MM-YYYY", new Date(timestamp * 1000)),
          expected,
          `for timestamp ${timestamp}`
        );
      }
    });

    it("should format date as YYYY-MM-DD UTC", () => {
      const testcases: [number, string][] = [
        [END_OF_YEAR, "2024-12-31"],
        [END_OF_YEAR + 1, "2025-01-01"],
      ];

      for (const [timestamp, expected] of testcases) {
        assert.equal(
          formatDate("YYYY-MM-DD", new Date(timestamp * 1000)),
          expected,
          `for timestamp ${timestamp}`
        );
      }
    });
  });
});
