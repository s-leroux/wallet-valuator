import { Swarm } from "../src/swarm.mjs";
import { assert } from "chai";

describe("The swarm collection", () => {
  it("should initialize", () => {
    const swarm = new Swarm();
  });

  it("should return the same object", () => {
    const swarm = new Swarm();
    const objA = swarm.find("MY_CHAIN", "MY_KEY");
    const objB = swarm.find("MY_CHAIN", "MY_KEY");

    assert.isObject(objA);
    assert.isObject(objB);
    assert.strictEqual(objA, objB);
  });

  it("should extend the object with the data", () => {
    const swarm = new Swarm();
    const objA = swarm.find("MY_CHAIN", "MY_KEY", { a: 1 });
    const objB = swarm.find("MY_CHAIN", "MY_KEY", { b: 2 });

    assert.isObject(objA);
    assert.isObject(objB);
    assert.strictEqual(objA, objB);
    assert.include(objA, { a: 1, b: 2 });
  });
});
