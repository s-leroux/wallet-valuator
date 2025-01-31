import { assert } from "chai";

import { Address } from "../src/address.mjs";
import { Swarm } from "../src/swarm.mjs";
import { FakeExplorer } from "./fake-explorer.mjs";
import { FakeCryptoResolver } from "./support/cryptoresolver.fake.mjs";
import { CryptoRegistry } from "../src/cryptoregistry.mjs";

describe("Address", function () {
  const registry = CryptoRegistry.create();
  const cryptoResolver = new FakeCryptoResolver();

  it("can be created from a chain and an address string", async function () {
    const test_cases: [string, string][] = [
      ["gnosis", "0x12345678901234567890"],
    ];
    for (const [chain, address] of test_cases) {
      const explorer = new FakeExplorer(chain);
      const swarm = new Swarm([explorer], registry, cryptoResolver);

      const addr = new Address(swarm, explorer, address);

      assert.equal(addr.address, address);
      assert.equal(addr.explorer, explorer);
    }
  });
});
