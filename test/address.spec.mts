import { assert } from "chai";

import { Address } from "../src/address.mjs";

describe("Address", function () {
  it("can be created from a chain and an address string", async function () {
    const test_cases: [string, string][] = [
      ["gnosis", "0x12345678901234567890"],
    ];
    for (const [chain, address] of test_cases) {
      const addr = new Address(null, chain, address);

      assert.equal(addr.chain, chain);
      assert.equal(addr.address, address);
    }
  });
});
