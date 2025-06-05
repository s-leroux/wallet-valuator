import { assert } from "chai";
import { describe, it } from "mocha";
import { InstanceCache } from "../src/instancecache.mjs";

describe("InstanceCache", () => {
  // Test class for string keys
  class TestValue {
    readonly value: number;

    constructor(value: number) {
      this.value = value;
    }
  }

  // Test class for number keys
  class NumberTestValue {
    readonly value: number;

    constructor(value: number) {
      this.value = value;
    }
  }

  it("should create and retrieve cached instances", () => {
    const cache = new InstanceCache<string, TestValue>();
    const value1 = cache.getOrCreate("test1", TestValue, 42);
    const value2 = cache.getOrCreate("test1", TestValue, 42);

    assert.strictEqual(value1, value2, "Should return the same instance");
    assert.strictEqual(value1.value, 42, "Should have correct value");
  });

  it("should create different instances for different keys", () => {
    const cache = new InstanceCache<string, TestValue>();
    const value1 = cache.getOrCreate("test1", TestValue, 42);
    const value2 = cache.getOrCreate("test2", TestValue, 42);

    assert.notStrictEqual(value1, value2, "Should return different instances");
    assert.strictEqual(value1.value, value2.value, "Should have same value");
  });

  it("should handle numeric keys", () => {
    const cache = new InstanceCache<number, NumberTestValue>();
    const value1 = cache.getOrCreate(1, NumberTestValue, 42);
    const value2 = cache.getOrCreate(1, NumberTestValue, 42);

    assert.strictEqual(value1, value2, "Should return the same instance");
    assert.strictEqual(value1.value, 42, "Should have correct value");
  });

  it("should maintain separate caches for different key types", () => {
    const stringCache = new InstanceCache<string, TestValue>();
    const numberCache = new InstanceCache<number, NumberTestValue>();

    const stringValue = stringCache.getOrCreate("1", TestValue, 42);
    const numberValue = numberCache.getOrCreate(1, NumberTestValue, 42);

    assert.notStrictEqual(
      stringValue as object,
      numberValue as object,
      "Should be different instances"
    );
  });

  it("should handle constructor arguments correctly", () => {
    const cache = new InstanceCache<string, TestValue>();
    const value1 = cache.getOrCreate("test1", TestValue, 42);
    const value2 = cache.getOrCreate("test1", TestValue, 43); // Different value

    assert.strictEqual(value1, value2, "Should return the same instance");
    assert.strictEqual(value1.value, 42, "Should keep original value");
  });
});
