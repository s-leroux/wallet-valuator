import { assert } from "chai";

import { prepare } from "./support/register.helper.mjs";

import { Swarm } from "../src/swarm.mjs";
import { FakeExplorer } from "./fake-explorer.mjs";
import { FakeCryptoResolver } from "./support/cryptoresolver.fake.mjs";
import { CryptoRegistryNG, CryptoMetadata } from "../src/cryptoregistry.mjs";
import { asBlockchain } from "../src/blockchain.mjs";
import { Block } from "../src/block.mjs";

describe("Block", function () {
  const cryptoRegistry = CryptoRegistryNG.create();
  const cryptoMetadata = CryptoMetadata.create();
  const cryptoResolver = FakeCryptoResolver.create();

  const G = asBlockchain("gnosis");
  const test_cases = [[G, 28600024]] as const;

  describe("can be created from a chain and an block number", function () {
    const register = prepare(this);

    for (const [chain, blockNumber] of test_cases) {
      register(`case ${chain} ${blockNumber}`, () => {
        const explorer = new FakeExplorer(cryptoRegistry, chain);
        const swarm = Swarm.create(
          [explorer],
          cryptoRegistry,
          cryptoMetadata,
          cryptoResolver
        );

        const block = new Block(swarm, chain, blockNumber);

        assert.equal(block.blockNumber, blockNumber);
        assert.equal(block.explorer, explorer);
      });
    }
  });

  describe("should return the block number with toString()", function () {
    const register = prepare(this);

    for (const [chain, blockNumber] of test_cases) {
      register(`case ${chain} ${blockNumber}`, () => {
        const explorer = new FakeExplorer(cryptoRegistry, chain);
        const swarm = Swarm.create(
          [explorer],
          cryptoRegistry,
          cryptoMetadata,
          cryptoResolver
        );

        const block = new Block(swarm, chain, blockNumber);

        assert.equal(block.toString(), blockNumber);
      });
    }
  });
});
