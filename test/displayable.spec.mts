import { assert } from "chai";
import { toDisplayString, Displayable } from "../src/displayable.mjs";
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
