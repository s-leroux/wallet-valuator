import { assert } from "chai";

import { Address } from "../src/address.mjs";
import { Explorer } from "../src/services/explorer.mjs";

class FakeExplorer extends Explorer {}

describe("Address", function () {
  it("can be created from a chain and an address string", async function () {
    const test_cases: [string, string][] = [
      ["gnosis", "0x12345678901234567890"],
    ];
    for (const [chain, address] of test_cases) {
      const explorer = new FakeExplorer(chain);
      const addr = new Address(explorer, address);

      assert.equal(addr.chain, chain);
      assert.equal(addr.address, address);
    }
  });
});
