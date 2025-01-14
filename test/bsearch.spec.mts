import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";

import { ValueError } from "../src/error.mjs";
import { Table } from "../src/bsearch.mjs";

describe("Table", function () {
  it("can be created from an array of tuples", function () {
    const data: [string, number][] = [
      ["A", 1],
      ["B", 2],
      ["C", 3],
    ];

    const table = new Table(data);
    assert.deepEqual(table.toArray(), data);
    assert.notEqual(table.toArray(), table.table);
  });

  it("expects ordered data", function () {
    const data: [string, number][] = [
      ["A", 1],
      ["C", 3],
      ["B", 2],
    ];

    assert.throws(() => {
      const table = new Table(data);
      assert.deepEqual(table.toArray(), data.sort());
    }, ValueError);
  });

  describe("get()", function () {
    const register = prepare(this);

    let data: [string, number][] = [
      ["D", 1],
      ["E", 2],
      ["F", 3],
      ["H", 4],
    ];

    let table = new Table(data);
    afterEach(() => {
      table = new Table(data);
    });

    describe("should return the maching row if it exists", function () {
      const register = prepare(this);

      for (const expected of data) {
        register(`case ${expected[0]} => ${expected}`, () => {
          const row = table.get(expected[0]);
          assert.equal(row, expected);
        });
      }
    });

    describe("should return the latest known value if the exact row does not exist", function () {
      const register = prepare(this);

      const testcases = [
        ["A", undefined],
        ["B", undefined],
        ["C", undefined],
        ["G", data[2]],
        ["I", data[3]],
      ] as const;

      for (const [key, expected] of testcases) {
        register(`case ${key} => ${expected}`, () => {
          const row = table.get(key);
          assert.equal(row, expected);
        });
      }
    });
  });
});
