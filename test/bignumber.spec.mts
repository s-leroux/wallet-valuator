import { assert } from "chai";

import { BigNumber } from "../src/bignumber.mjs";

describe("BigNumber", function () {
  it("can be created from and to string with at least 20 significant digits", async function () {
    const N = "12345678901234567890";
    const M = +12345678901234567000; // Notice the loss of precision compared to above
    const bn = new BigNumber(N);
    assert.equal(bn.toNumber(), M);
    assert.equal(bn.toString(), N);
  });
});
