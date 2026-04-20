import { assert } from "chai";

import { Text } from "../src/text.mjs";

describe("Text", () => {
  it("splits a multiline string and rejoins with toString", () => {
    const src = "line1\nline2\nline3";
    const text = new Text(src);

    assert.strictEqual(text.length, 3);
    assert.strictEqual(text.toString(), src);
  });

  it("toDisplayString matches toString", () => {
    const src = "a\nb\nc";
    const text = new Text(src);

    assert.strictEqual(text.length, 3);
    assert.strictEqual(text.toDisplayString(), text.toString());
  });

  it("drops trailing split artifact when source ends with \\n", () => {
    const src = "alpha\nbeta\n";
    const text = new Text(src);

    assert.strictEqual(text.length, 2);
    assert.strictEqual(text.toString(), "alpha\nbeta");
  });

  it("concatenates two Text instances", () => {
    const left = new Text("one\ntwo");
    const right = new Text("three\nfour");

    const combined = new Text(left);
    combined.push(right);

    assert.strictEqual(combined.length, 4);
    assert.strictEqual(combined.toString(), "one\ntwo\nthree\nfour");
  });

  it("accepts string[] as TextSource in constructor", () => {
    const src = ["foo", "bar", "baz"];
    const text = new Text(src);

    assert.strictEqual(text.length, 3);
    assert.strictEqual(text.toString(), "foo\nbar\nbaz");
  });

  it("accepts string[] as TextSource in push", () => {
    const text = new Text("start");

    text.push(["next", "last"]);

    assert.strictEqual(text.length, 3);
    assert.strictEqual(text.toString(), "start\nnext\nlast");
  });

  it("handles string[] items that contain embedded newlines", () => {
    const src = ["foo\nbar", "baz"];
    const text = new Text(src);

    assert.strictEqual(text.length, 3);
    assert.strictEqual(text.toString(), "foo\nbar\nbaz");
  });
});
