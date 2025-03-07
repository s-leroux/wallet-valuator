import { Test } from "mocha";
import type { Suite } from "mocha";

import { ValueError } from "../../src/error.mjs";
import { Table } from "../../src/bsearch.mjs";

/**
 * Create a wrapper to dynamiccally register nes tests with Mocha.
 *
 * Usage:
 *
 * describe("this or that", function () {
 *    const register = prepare(this);
 *
 *    register("should pass", () => {
 *      assert(...)
 *    })
 * })
 */
export function prepare(suite: Suite) {
  return function (msg: string, fn: any) {
    suite.addTest(new Test(msg, fn));
  };
}
