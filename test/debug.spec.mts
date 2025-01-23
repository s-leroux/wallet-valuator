import { assert } from "chai";

import { register, debugId } from "../src/debug.mjs";

describe("Debugging utilities", () => {
  const idRegex = /^ID-\d{6}$/;
  describe("register()", () => {
    it("should associate the object with an id", () => {
      const obj = {};

      assert.notMatch(debugId(obj), idRegex);
      register(obj);

      assert.match(debugId(obj), idRegex);
    });
  });
});
