import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";
import { ValueError } from "../src/error.mjs";

import { formatDate, parseDate } from "../src/date.mjs";

const END_OF_YEAR = 1735689599; // timestamp for 2024-12-31 23:59:59

describe("Date utilities", () => {
  describe("formatDate()", () => {
    it("should format date as DD-MM-YYYY", () => {
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

    it("should format date as YYYY-MM-DD", () => {
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

    it("should format date as MMM D, YYYY", () => {
      const testcases: [number, string][] = [
        [END_OF_YEAR, "Dec 31, 2024"],
        [END_OF_YEAR + 1, "Jan 1, 2025"],
      ];

      for (const [timestamp, expected] of testcases) {
        assert.equal(
          formatDate("MMM D, YYYY", new Date(timestamp * 1000)),
          expected,
          `for timestamp ${timestamp}`
        );
      }
    });
  });

  describe("parseDate()", () => {
    describe("should parse date with the format", function () {
      const register = prepare(this);

      //prettier-ignore
      const testcases = [
        [ "20221224", "YYYYMMDD", "2022", "12", "24" ],
        [ "2022-12-24", "YYYY-MM-DD", "2022", "12", "24" ],
        [ "24-12-2022", "DD-MM-YYYY", "2022", "12", "24" ],
        [ "24--12--2022", /(?<day>\d\d)--(?<month>\d\d)--(?<year>\d\d\d\d)/, "2022", "12", "24" ],
      ] as const;

      for (const [input, format, year, month, day] of testcases) {
        register(`${input} as ${format}`, () => {
          const date = parseDate(format, input);

          assert.equal(
            date.toISOString(),
            `${year}-${month}-${day}T00:00:00.000Z`
          );
        });
      }
    });

    describe("should reject", function () {
      const register = prepare(this);

      //prettier-ignore
      const testcases = [
        [ "2022", "YYYY", ValueError ],
        [ "2022-12", "YYYY-MM", ValueError ],
        [ "2022-12", "YYYY-MM-DD", ValueError ],
        [ "24-12-2022", /.*/, TypeError],
        [ "12--2022", /(?<month>\d\d)--(?<year>\d\d\d\d)/, ValueError],
        [ "24--12--202Z", /(?<day>..)--(?<month>..)--(?<year>....)/, ValueError ],
        [ "--12--202Z", /(?<day>.*)--(?<month>..)--(?<year>....)/, ValueError ],
      ] as const;

      for (const [input, format, error] of testcases) {
        register(`${input} as ${format}`, () =>
          assert.throws(() => parseDate(format, input), error)
        );
      }
    });
  });
});
