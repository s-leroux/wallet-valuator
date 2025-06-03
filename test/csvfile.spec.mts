import { assert } from "chai";
import { readFile } from "node:fs/promises";

import { prepare } from "./support/register.helper.mjs";

import {
  lineIterator,
  itemIterator,
  CSVFile,
  parseCSV,
} from "../src/csvfile.mjs";
import { ValueError } from "../src/error.mjs";
import { ProtocolError } from "../src/error.mjs";

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

describe("CSV parser", function () {
  describe("Should parse valid RFC-4180 input", function () {
    const register = prepare(this);
    // prettier-ignore
    const testcases = [
      // Single line
      ["", [], "Empty file should produce no records according to RFC 4180"],
      ["\n", [[""]], "Single LF produces record with empty field according to RFC 4180"],
      ["\r\n", [[""]], "Single CRLF produces record with empty field according to RFC 4180"],
      ["data", [["data"]], "Single unquoted field is a valid record according to RFC 4180"],
      ["\"data\"", [["data"]], "Single quoted field is a valid record according to RFC 4180"],
      ["data\n", [["data"]], "Trailing LF is treated as record terminator according to RFC 4180"],
      ["data\r\n", [["data"]], "Trailing CRLF is treated as record terminator according to RFC 4180"],
      ["\"data\n\"", [["data\n"]], "Quoted fields can contain line breaks according to RFC 4180"],
      ["\"data\r\n\"", [["data\r\n"]], "Quoted fields can contain CRLF sequences according to RFC 4180"],
      [" ", [[" "]], "Whitespace-only field is preserved according to RFC 4180"],
      [",", [["",""]], "Empty fields are preserved according to RFC 4180"],
      ["abc,def", [["abc","def"]], "Multiple unquoted fields are separated by commas according to RFC 4180"],
      ["\"abc,def\"", [["abc,def"]], "Quoted fields can contain commas according to RFC 4180"],
      ["\"abc\"\"def\"", [["abc\"def"]], "Double quotes are escaped by doubling according to RFC 4180"],

      // Multi-line
      ["abc,def\nghi,jkl", [["abc","def"],["ghi","jkl"]], "Multiple records are separated by line breaks according to RFC 4180"],
      ["abc,def\r\nghi,jkl", [["abc","def"],["ghi","jkl"]], "Multiple records are separated by line breaks according to RFC 4180"],
      ["abc,def\n\nghi,jkl", [["abc","def"],[""],["ghi","jkl"]], "Empty lines produce empty records according to RFC 4180"],
      ["abc,def\r\n\r\nghi,jkl", [["abc","def"],[""],["ghi","jkl"]], "Empty lines produce empty records according to RFC 4180"],
      ["abc,def\nghi,jkl\n", [["abc","def"],["ghi","jkl"]], "Trailing line break is ignored according to RFC 4180"],
      ["abc,def\r\nghi,jkl\r\n", [["abc","def"],["ghi","jkl"]], "Trailing line break is ignored according to RFC 4180"],
      ["abc,\"def\nghi\",jkl", [["abc","def\nghi","jkl"]], "Quoted fields can span multiple lines according to RFC 4180"],
      ["abc,\"def\r\nghi\",jkl", [["abc","def\r\nghi","jkl"]], "Quoted fields can span multiple lines according to RFC 4180"],
    ] as const;

    for (const [text, expected, description] of testcases) {
      register(description, () => {
        const result = Array.from(parseCSV(text));
        assert.deepEqual(result, expected as unknown);
      });
    }
  });

  describe("Should reject invalid RFC-4180 input", function () {
    const register = prepare(this);
    // prettier-ignore
    const testcases = [
      ["data\rdata", ProtocolError, "Standalone CR is not allowed according to RFC 4180"],
      ["\"unterminated", ProtocolError, "Quoted field must be terminated according to RFC 4180"],
    ] as const;

    for (const [text, error, description] of testcases) {
      register(description, () => {
        assert.throws(() => Array.from(parseCSV(text)), error);
      });
    }
  });

  describe("Should parse realistic input", async function () {
    const register = prepare(this);
    const text = await readFile("fixtures/fake-report.csv", {
      encoding: "utf8",
    });
    const testpoints = [
      [0, 7, "Fee Coin"],
      [1, 3, "42,150.50"],
      [4, 8, 'Note with quotes: "Special" transaction'],
      [6, 2, "TRADE"],
      [6, 3, ""],
      [6, 6, ""],
    ] as const;

    const data = Array.from(parseCSV(text));
    for (const [row, col, expected] of testpoints) {
      register(`data[${row}][${col}] = "${expected}"`, () => {
        assert.strictEqual(data[row][col], expected);
      });
    }
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
