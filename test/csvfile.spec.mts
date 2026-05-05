import { assert } from "chai";
import { readFile } from "node:fs/promises";

import { prepare } from "./support/register.helper.mjs";

import { CSVFile, parseCSV } from "../src/datasource.mjs";
import { ValueError } from "../src/error.mjs";
import { ProtocolError } from "../src/error.mjs";

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

  describe("Should parse realistic input", function () {
    const register = prepare(this);

    let parsedRows: string[][];

    before(async function () {
      const text = await readFile("fixtures/fake-report.csv", {
        encoding: "utf8",
      });
      parsedRows = Array.from(parseCSV(text));
    });

    const testpoints = [
      [0, 7, "Fee Coin"],
      [1, 3, "42,150.50"],
      [4, 8, 'Note with quotes: "Special" transaction'],
      [6, 2, "TRADE"],
      [6, 3, ""],
      [6, 6, ""],
    ] as const;

    for (const [row, col, expected] of testpoints) {
      register(`data[${row}][${col}] = "${expected}"`, () => {
        assert.strictEqual(parsedRows[row][col], expected);
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
        String,
      );
      assert.exists(csvFile);
    });

    describe("get()", function () {
      const register = prepare(this);

      let csvFile: CSVFile<string, string>;

      before(async function () {
        csvFile = await CSVFile.createFromPath(CSV_TEST_FILE, String, String);
      });

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

    describe("getMany()", function () {
      const register = prepare(this);

      let csvFile: CSVFile<string, string>;

      before(async function () {
        csvFile = await CSVFile.createFromPath(CSV_TEST_FILE, String, String);
      });

      // prettier-ignore
      const testcases: [string, string[], string[]][] = [
        ["2020-04-22 00:00:00 UTC", ["price", "total_volume"], ["0.5728269210770057", "9610841.993019182"]],
        ["2020-04-29 00:00:00 UTC", ["total_volume", "market_cap"], ["7387289.032147021", "5283691.351331575"]],
      ];

      for (const [row, cols, expected] of testcases) {
        register(
          `case ${row} ${cols.join(",")} = ${expected.join(",")}`,
          () => {
            const actual = csvFile.getMany(row, cols);
            assert.deepEqual(actual && actual.slice(1), expected);
          },
        );
      }
    });

    it("should be iterable", async function () {
      const csvFile = await CSVFile.createFromPath(
        CSV_TEST_FILE,
        String,
        String,
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

    describe("Reordering", function () {
      const register = prepare(this);

      let csvFile: CSVFile<string, string>;

      before(async function () {
        csvFile = await CSVFile.createFromPath(
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
          },
        );
      });

      // prettier-ignore
      const testcases = [
        ["2023-01-14 12:36", "Sent Amount", "69.924364"],
        ["2023-01-14 15:33", "ID", "ce7d4d..5c"],
        ["2023-01-14 16:19", "Age", undefined, ValueError], // Should fail
        ["2023-01-14 17:29", "Date", undefined],
      ] as const;

      for (const [row, col, expected, error] of testcases) {
        register(`case ${row} ${col} = ${error ? "💣" : expected} `, () => {
          function doIt() {
            const actual = csvFile.get(row, col);
            assert.deepEqual(actual && actual[1], expected);
          }

          if (error) {
            assert.throws(doIt, error);
          } else {
            doIt();
          }
        });
      }
    });
  });

  describe("options", function () {
    describe("separator", function () {
      it("parses [string,string,string] rows with a semicolon separator", () => {
        // Hard-coded semicolon-delimited triples: key column + two data columns per row.
        // prettier-ignore
        const text = [
          "left;middle;right",
          "row-one;alfa;omega",
          "row-two;ping;pong",
        ].join("\n");

        const csvFile = CSVFile.createFromText(text, String, String, {
          separator: ";",
        });

        assert.deepEqual(csvFile.get("row-one", "middle"), ["row-one", "alfa"]);
        assert.deepEqual(csvFile.get("row-two", "right"), ["row-two", "pong"]);
      });
    });

    describe("garbage-lines", function () {
      it("drops a fixed number of LF-terminated leading lines before the heading row", () => {
        // Two preamble lines (not RFC CSV header), then the same shape as the invalid-row tests.
        // prettier-ignore
        const text = [
          "Preamble: ignored",
          "Also ignored",
          "key,value1,value2",
          "K1,V1.1,V1.2",
          "K2,V2.1,V2.2",
        ].join("\n");

        const csvFile = CSVFile.createFromText(text, String, String, {
          "garbage-lines": 2,
        });

        assert.deepEqual(csvFile.get("K1", "value1"), ["K1", "V1.1"]);
        assert.deepEqual(csvFile.get("K2", "value2"), ["K2", "V2.2"]);
      });

      it("throws ProtocolError when the file ends before every garbage line is terminated", () => {
        // Only one full line plus LF; option asks to drop two lines.
        const text = "only one garbage line\n";

        assert.throws(
          () =>
            CSVFile.createFromText(text, String, String, {
              "garbage-lines": 2,
            }),
          ProtocolError,
          /still expecting 1 garbage lines/,
        );
      });

      it("throws when garbage-lines is larger than the real preamble (header is consumed)", () => {
        // One preamble line; asking for two drops the real heading row as “garbage”.
        // prettier-ignore
        const text = [
          "NOISE",
          "key,value1,value2",
          "K1,V1.1,V1.2",
        ].join("\n");

        assert.throws(
          () =>
            CSVFile.createFromText(text, String, String, {
              "garbage-lines": 2,
            }),
          ValueError,
          /No data to proceed/,
        );
      });
    });

    describe("user-supplied headings", function () {
      it("maps columns from headings option while every CSV line is a data row", () => {
        // No heading row in the file — options.headings define column names.
        // prettier-ignore
        const text = [
          "row-one,alfa,omega",
          "row-two,ping,pong",
        ].join("\n");

        const csvFile = CSVFile.createFromText(text, String, String, {
          headings: ["left", "middle", "right"],
        });

        assert.deepEqual(csvFile.get("row-one", "middle"), ["row-one", "alfa"]);
        assert.deepEqual(csvFile.get("row-two", "right"), ["row-two", "pong"]);
      });
    });

    describe("invalid row conversions (undefined)", function () {
      // prettier-ignore
      const headingAndRows = [
        "key,value1,value2",
        "K1,V1.1,V1.2",
        "K2,V2.1,V2.2",
        "K3,V3.1,V3.2",
        "K4,V4.1,V4.2",
      ].join("\n");

      const convertRejectBad = (s: string): string | undefined =>
        s === "__bad__" ? undefined : s;

      it("throws ValueError when a key is undefined", () => {
        const text = headingAndRows.replace("K2", "__bad__");
        assert.throws(
          () => CSVFile.createFromText(text, convertRejectBad, String),
          ValueError,
          /Invalid CSV data row 2:/,
        );
      });

      it("throws ValueError when toData returns undefined", () => {
        const text = headingAndRows.replace("V3.2", "__bad__");
        assert.throws(
          () => CSVFile.createFromText(text, String, convertRejectBad),
          ValueError,
          /Invalid CSV data row 3:/,
        );
      });

      it("skipInvalidRows ignores invalid rows", () => {
        const text = headingAndRows
          .replace("K2", "__bad__")
          .replace("V3.2", "__bad__");
        const csvFile = //
          CSVFile.createFromText(text, convertRejectBad, convertRejectBad, {
            skipInvalidRows: true, // Ignore the invalid row
          });
        assert.deepEqual(csvFile.get("K1", "value1"), ["K1", "V1.1"]);
        assert.deepEqual(csvFile.get("K2", "value1"), ["K1", "V1.1"]); // best match
        assert.deepEqual(csvFile.get("K3", "value1"), ["K1", "V1.1"]); // best match
        assert.deepEqual(csvFile.get("K4", "value1"), ["K4", "V4.1"]);
      });

      it("throws when every data row conversion fails and skipInvalidRows is true", () => {
        const text = headingAndRows.replace(/K\d/g, "__bad__");
        assert.throws(
          () =>
            CSVFile.createFromText(text, convertRejectBad, String, {
              skipInvalidRows: true,
            }),
          ValueError,
          "No data to proceed",
        );
      });
    });
  });
});
