import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";

import { lineIterator, itemIterator, CSVFile } from "../src/csvfile.mjs";
import { ValueError } from "../src/error.mjs";

describe("COOFile utilities", function () {
  describe("lineIterator", function () {
    describe("should iterate over lines", function () {
      const register = prepare(this);
      // prettier-ignore
      const testcases = [
        ["A\nBB\nCCC", ["A", "BB", "CCC"], "split lines on \\n"],
        ["A\nBB\nCCC\n", ["A", "BB", "CCC"], "ignore trailing newline (single)"],
        ["A\nBB\nCCC\n\n\n", ["A", "BB", "CCC"], "ignore trailing newline (multiple)"],
        ["A\nBB\n\n\nCCC", ["A", "BB", "CCC"], "ignore empty lines (middle)"],
        ["\n\nA\nBB\n\n\nCCC", ["A", "BB", "CCC"], "ignore empty lines (leading)"],
        ["\n\n\n\n\n", [], "parse newline-only string as []"],
        ["", [], "parse empty string as []"],
      ] as const;

      for (const [input, expected, message] of testcases) {
        register(message, () => {
          const result = Array.from(lineIterator(input));
          assert.deepEqual(result, expected as unknown);
        });
      }
    });
  });

  describe("itemIterator", function () {
    describe("should iterate over items", function () {
      const register = prepare(this);
      // prettier-ignore
      const testcases = [
        ["A--BB--CCC", "--", ["A", "BB", "CCC"], "split items on separator"],
        ["A--BB--CCC--", "--", ["A", "BB", "CCC", ""], "parse trailing separator"],
        ["--A--BB--CCC", "--", ["", "A", "BB", "CCC"], "parse leading separator"],
        ["A--BB----CCC", "--", ["A", "BB", "", "CCC"], "parse empty items"],
      ] as const;

      for (const [input, separator, expected, message] of testcases) {
        register(message, () => {
          const result = Array.from(itemIterator(input, separator));
          assert.deepEqual(result, expected as unknown);
        });
      }
    });
  });
});

describe("CSVFile", function () {
  describe("Basic functions", function () {
    const CSV_TEST_FILE = "fixtures/sol-usd-max.csv";

    it("Can be created from file", async () => {
      const csvFile = await CSVFile.createFromPath(
        CSV_TEST_FILE,
        String,
        String
      );
      assert.exists(csvFile);
    });

    describe("get()", async function () {
      const register = prepare(this);
      const csvFile = await CSVFile.createFromPath(
        CSV_TEST_FILE,
        String,
        String
      );
      // prettier-ignore
      const testcases = [
      ["2020-04-15 00:00:00 UTC", "price", "0.666673390515131"],
    ] as const;

      for (const [row, col, expected] of testcases) {
        register(`case ${row} ${col} = ${expected}`, () => {
          const actual = csvFile.get(row, col);
          assert.deepEqual(actual && actual[1], expected);
        });
      }
    });

    it("should be iterable", async function () {
      const csvFile = await CSVFile.createFromPath(
        CSV_TEST_FILE,
        String,
        String
      );

      let lineCount = 0;
      for (const [date, ...rest] of csvFile) {
        lineCount += 1;
        assert.isTrue(date.endsWith(" UTC")); // Check the first item is really a date
        for (const item of rest) {
          assert.equal(String(Number(item)), item);
        }
      }
      assert.equal(lineCount, 1743);
    });

    describe("Reordering", async function () {
      const register = prepare(this);
      const csvFile = await CSVFile.createFromPath(
        "./fixtures/Binance/binance-report.csv",
        String,
        String,
        {
          reorder(input, heading) {
            // Swap columns 0 and 1
            // ISSUE #134 As a matter of fact, you can change in-place input, no need to return it :/
            const temp = input[0];
            input[0] = input[1];
            input[1] = temp;

            return input;
          },
        }
      );

      // prettier-ignore
      const testcases = [
        ["2023-01-14 12:36", "Sent Amount", "69.924364"],
        ["2023-01-14 15:33", "ID", "ce7d4d..5c"],
        ["2023-01-14 16:19", "Date", "2023-01-14 16:19", ValueError], // Should fail
      ] as const;

      for (const [row, col, expected, error] of testcases) {
        register(
          `case ${row} ${col} = ${expected}${error ? " 💣" : ""} `,
          () => {
            function doIt() {
              const actual = csvFile.get(row, col);
              assert.deepEqual(actual && actual[1], expected);
            }

            if (error) {
              assert.throws(doIt, error);
            } else {
              doIt();
            }
          }
        );
      }
    });
  });
});
