import { Test } from "mocha";
import type { Suite } from "mocha";

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
  return function (msg: string, fn: Mocha.Func) {
    suite.addTest(new Test(msg, fn));
  };
}
