import { Swarm } from "../src/swarm.mjs";
import { assert } from "chai";

import { Explorer } from "../src/services/explorer.mjs";
import { FakeExplorer } from "./fake-explorer.mjs";

describe("The swarm collection", () => {
  let swarm: Swarm;
  let explorer: Explorer;

  beforeEach(() => {
    explorer = new FakeExplorer();
    swarm = new Swarm([explorer]);
  });

  it("should return the same object", () => {
    const objA = swarm.address(explorer, "MY_KEY");
    const objB = swarm.address(explorer, "MY_KEY");

    assert.isObject(objA);
    assert.isObject(objB);
    assert.strictEqual(objA, objB);
  });

  it("should extend the object with the data", () => {
    const objA = swarm.address(explorer, "MY_KEY", { a: 1 });
    const objB = swarm.address(explorer, "MY_KEY", { b: 2 });

    assert.isObject(objA);
    assert.isObject(objB);
    assert.strictEqual(objA, objB);
    assert.include(objA.data, { a: 1, b: 2 });
  });
});
