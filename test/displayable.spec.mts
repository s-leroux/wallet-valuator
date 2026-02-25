import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";

import {
  toDisplayString,
  Displayable,
  tabular,
  TextUtils,
  DateFormat,
} from "../src/displayable.mjs";
import { NotImplementedError, ValueError } from "../src/error.mjs";

describe("toDisplayString", function () {
  it("should call toDisplayString() on Displayable objects", function () {
    class TestObject implements Displayable {
      toDisplayString() {
        return "custom string";
      }
    }
    const obj = new TestObject();
    assert.strictEqual(toDisplayString(obj), "custom string");
  });

  it("should throw an error if toDisplayString() is missing", function () {
    const obj = { key: "value" }; // No toDisplayString() implementation
    assert.throws(() => toDisplayString(obj), NotImplementedError);
  });

  it("should return string representations for primitives", function () {
    assert.strictEqual(toDisplayString(42), "42");
    assert.strictEqual(toDisplayString(true), "true");
    assert.strictEqual(toDisplayString("hello"), "hello");
  });

  it("should return 'null' for null values", function () {
    assert.strictEqual(toDisplayString(null), "null");
  });

  it("should return 'undefined' for undefined values", function () {
    assert.strictEqual(toDisplayString(undefined), "undefined");
  });

  it("should propagate options to toDisplayString()", function () {
    // TBD
  });

  it("should forward Date to TextUtils.formatDate()", function () {
    const date = "2026-02-10";

    assert.strictEqual(
      toDisplayString(new Date(date), { "date.format": "YYYY-MM-DD" }),
      date,
    );
  });

  it("should return '[]' for empty arrays", function () {
    assert.strictEqual(toDisplayString([]), "[]");
  });

  it("should indent content of arrays", function () {
    assert.strictEqual(toDisplayString([1, 2, 3]), "[\n  1\n  2\n  3\n]");
  });

  it("should display maps values", function () {
    const map = new Map<number, string>([
      [1, "one"],
      [2, "two"],
      [3, "three"],
    ]);
    assert.strictEqual(
      toDisplayString(map),
      "Map([\n  one\n  two\n  three\n])",
    );
  });
});

describe("tabular", function () {
  describe("format", function () {
    const register = prepare(this);

    // prettier-ignore
    const testcases = [
      ["123.456", "10.2", "    123.45", "align anchor"],
      ["hello", "10", "     hello", "align right"],
      ["hello", "+10", "     hello", "align right (explicit)"],
      ["hello", "-10", "hello     ", "align left"],
      ["hello", "4", "…llo", "cut left"],
      ["hello", "-4", "hel…", "cut right"],
      ["hello", "", "hello", "verbatim"],
    ] as const;

    for (const [input, format, expected, desc] of testcases) {
      register(desc, () => {
        const t = tabular("", format);
        assert.equal(t(input), expected);
      });
    }
  });
});

describe("TextUtils", function () {
  describe("indent", function () {
    it("should indent lines with default shift width", function () {
      const result = TextUtils.indent(["Line 1", "Line 2"], 2);
      assert.deepEqual(result, ["    Line 1", "    Line 2"]); // 2*2 spaces
    });

    it("should TextUtils.indent lines with a custom shift width", function () {
      const result = TextUtils.indent(["Hello"], 3, { "shift.width": 4 });
      assert.deepEqual(result, ["            Hello"]); // 3*4 spaces
    });

    it("should throw an error if n is not a positive integer", function () {
      assert.throws(() => TextUtils.indent(["Test"], -1), ValueError);
      assert.throws(() => TextUtils.indent(["Test"], 2.5), ValueError);
      assert.throws(() => TextUtils.indent(["Test"], 0), ValueError);
    });

    it("should apply no TextUtils.indentation when shiftWidth is 0", function () {
      const result = TextUtils.indent(["No Indent"], 1, { "shift.width": 0 });
      assert.deepEqual(result, ["No Indent"]);
    });

    it("should handle an empty input array", function () {
      assert.deepEqual(TextUtils.indent([], 2), []);
    });
  });

  describe("formatDate", function () {
    // prettier-ignore
    const testcases: [date: number | Date, format : DateFormat, expected:string, desc:string][] = [
      [ new Date("2026-02-10"), "YYYY-MM-DD", "2026-02-10", "formats full ISO date"],
      [ new Date("2026-02-10"), "YYYY", "2026", "formats year only"],
      [ new Date("2026-02-10").getTime(), "YYYY-MM-DD", "2026-02-10", "accepts timestamp input"],
      [ new Date("2026-02-10").getTime(), (date) => String(date.getTime()), "1770681600000", "custom function"],
    ] as const;

    const register = prepare(this);
    for (const [date, format, expected, desc] of testcases) {
      register(desc, function () {
        const result = TextUtils.formatDate(date, { "date.format": format });

        assert.strictEqual(result, expected);
      });
    }
  });
});
