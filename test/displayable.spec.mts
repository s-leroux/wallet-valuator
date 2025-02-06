import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";

import { toDisplayString, Displayable, tabular } from "../src/displayable.mjs";
import { NotImplementedError } from "../src/error.mjs";

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
    ] as const;

    for (const [input, format, expected, desc] of testcases) {
      register(desc, () => {
        const t = tabular("", format);
        assert.equal(t(input), expected);
      });
    }
  });
});
