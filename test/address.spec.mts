import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";

import { Address } from "../src/address.mjs";
import { Swarm } from "../src/swarm.mjs";
import { FakeExplorer } from "./fake-explorer.mjs";
import { FakeCryptoResolver } from "./support/cryptoresolver.fake.mjs";
import { CryptoRegistry } from "../src/cryptoregistry.mjs";
import { asBlockchain } from "../src/blockchain.mjs";

describe("Address", function () {
  const registry = CryptoRegistry.create();
  const cryptoResolver = FakeCryptoResolver.create();

  const G = asBlockchain("gnosis");
  const test_cases = [[G, "0x12345678901234567890"]] as const;

  describe("can be created from a chain and an address string", function () {
    const register = prepare(this);

    for (const [chain, address] of test_cases) {
      register(`case ${chain} ${address}`, () => {
        const explorer = new FakeExplorer(chain);
        const swarm = new Swarm([explorer], registry, cryptoResolver);

        const addr = new Address(swarm, chain, address);

        assert.equal(addr.address, address);
        assert.equal(addr.explorer, explorer);
      });
    }
  });

  describe("should return the full address with toString()", function () {
    const register = prepare(this);

    for (const [chain, address] of test_cases) {
      register(`case ${chain} ${address}`, () => {
        const explorer = new FakeExplorer(chain);
        const swarm = new Swarm([explorer], registry, cryptoResolver);

        const addr = new Address(swarm, chain, address);

        assert.equal(addr.toString(), address);
      });
    }
  });
});
