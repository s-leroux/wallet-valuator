import { assert } from "chai";
import { describe, it } from "mocha";
import { InstanceCache, ValueWithKey } from "../src/instancecache.mjs";
import { AssertionError } from "../src/error.mjs";

describe("InstanceCache", () => {
  // Test class that implements ValueWithKey with string key
  class TestValue implements ValueWithKey<string> {
    readonly key: string;
    readonly value: number;

    constructor(key: string, value: number) {
      this.key = key;
      this.value = value;
    }
  }

  // Test class that implements ValueWithKey with number key
  class NumberTestValue implements ValueWithKey<number> {
    readonly key: number;
    readonly value: number;

    constructor(key: number, value: number) {
      this.key = key;
      this.value = value;
    }
  }

  // Test class that violates the key contract
  class BadTestValue implements ValueWithKey<string> {
    readonly key: string;
    readonly value: number;

    constructor(key: string, value: number) {
      this.key = "wrong-" + key; // Intentionally wrong key
      this.value = value;
    }
  }

  it("should create and retrieve cached instances", () => {
    const cache = new InstanceCache<string, TestValue>();
    const value1 = cache.getOrCreate("test1", TestValue, "test1", 42);
    const value2 = cache.getOrCreate("test1", TestValue, "test1", 42);

    assert.strictEqual(value1, value2, "Should return the same instance");
    assert.strictEqual(value1.value, 42, "Should have correct value");
  });

  it("should create different instances for different keys", () => {
    const cache = new InstanceCache<string, TestValue>();
    const value1 = cache.getOrCreate("test1", TestValue, "test1", 42);
    const value2 = cache.getOrCreate("test2", TestValue, "test2", 42);

    assert.notStrictEqual(value1, value2, "Should return different instances");
    assert.strictEqual(value1.value, value2.value, "Should have same value");
  });

  it("should throw AssertionError when factory returns wrong key 💣", () => {
    const cache = new InstanceCache<string, BadTestValue>();

    assert.throws(
      () => cache.getOrCreate("test1", BadTestValue, "test1", 42),
      AssertionError,
      "Factory returned object with key wrong-test1 but expected test1"
    );
  });

  it("should handle numeric keys", () => {
    const cache = new InstanceCache<number, NumberTestValue>();
    const value1 = cache.getOrCreate(1, NumberTestValue, 1, 42);
    const value2 = cache.getOrCreate(1, NumberTestValue, 1, 42);

    assert.strictEqual(value1, value2, "Should return the same instance");
    assert.strictEqual(value1.value, 42, "Should have correct value");
  });

  it("should maintain separate caches for different key types", () => {
    const stringCache = new InstanceCache<string, TestValue>();
    const numberCache = new InstanceCache<number, NumberTestValue>();

    const stringValue = stringCache.getOrCreate("1", TestValue, "1", 42);
    const numberValue = numberCache.getOrCreate(1, NumberTestValue, 1, 42);

    assert.notStrictEqual(
      stringValue as object,
      numberValue as object,
      "Should be different instances"
    );
  });

  it("should handle constructor arguments correctly", () => {
    const cache = new InstanceCache<string, TestValue>();
    const value1 = cache.getOrCreate("test1", TestValue, "test1", 42);
    const value2 = cache.getOrCreate("test1", TestValue, "test1", 43); // Different value

    assert.strictEqual(value1, value2, "Should return the same instance");
    assert.strictEqual(value1.value, 42, "Should keep original value");
  });
});
