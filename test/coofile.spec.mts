import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";

import {
  lineIterator,
  itemIterator,
  COOFile,
  CSVFile,
} from "../src/coofile.mjs";

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

const COO_DATA = `
2023-13-25,TK_1,11
2023-13-26,TK_2,22
2023-13-26,TK_1,33
`;
describe("COOFile", function () {
  it("Can be created from text data", async () => {
    const cooFile = COOFile.createFromText(COO_DATA, parseInt);
    assert.exists(cooFile);
  });

  describe("get()", function () {
    const register = prepare(this);
    const cooFile = COOFile.createFromText(COO_DATA, parseInt);
    // prettier-ignore
    const testcases = [
      ["2023-13-24", "TK_1", undefined],
      ["2023-13-24", "TK_2", undefined],
      ["2023-13-25", "TK_1", 11],
      ["2023-13-25", "TK_2", undefined],
      ["2023-13-26", "TK_1", 33],
      ["2023-13-26", "TK_2", 22],
      ["2023-13-27", "TK_1", 33],
      ["2023-13-27", "TK_2", 22],
    ] as const;

    for (const [row, col, expected] of testcases) {
      register(`case ${row} ${col}`, () => {
        const actual = cooFile.get(row, col);
        assert.deepEqual(actual && actual[1], expected);
      });
    }
  });
});

const CSV_TEST_FILE = "fixtures/sol-usd-max.csv";
describe("CSVFile", function () {
  it("Can be created from file", async () => {
    const csvFile = await CSVFile.createFromPath(CSV_TEST_FILE, parseInt);
    assert.exists(csvFile);
  });

  describe("get()", async function () {
    const register = prepare(this);
    const csvFile = await CSVFile.createFromPath(CSV_TEST_FILE, String);
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
});
