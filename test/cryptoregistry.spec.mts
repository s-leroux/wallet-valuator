import { assert } from "chai";

import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import { CryptoRegistry } from "../src/cryptoregistry.mjs";

describe("CryptoRegistry", () => {
  const { ethereum, bitcoin } = FakeCryptoAsset;

  it("should provide a factory function", () => {
    const registry = CryptoRegistry.create();

    assert.equal(registry.constructor.name, CryptoRegistry.name);
  });

  describe("behaviour", () => {
    let registry: CryptoRegistry;

    beforeEach(() => {
      registry = CryptoRegistry.create();
    });

    it("should set and retrieve metadata for a currency", () => {
      const obj = { x: 1, y: "abc" };
      registry.setDomainData(ethereum, "STANDARD", obj);

      const result = registry.getDomainData(ethereum, "STANDARD");

      assert.notStrictEqual(result, obj);
      assert.deepEqual(result, obj);
    });

    it("should replace metadata for existing domain", () => {
      const obj1 = { x: 1, y: "abc" };
      const obj2 = { x: 2, y: "xyz" };
      registry.setDomainData(ethereum, "STANDARD", obj1);
      registry.setDomainData(ethereum, "STANDARD", obj2);

      const result = registry.getDomainData(ethereum, "STANDARD");

      assert.notStrictEqual(result, obj2);
      assert.deepEqual(result, obj2);
    });

    it("should accept multiple domain metadata", () => {
      const data = [
        ["STANDARD", { x: 1, y: "abc" }],
        ["SPECIAL", { x: 2, y: "xyz" }],
      ] as const;

      for (const [domainName, domainData] of data) {
        registry.setDomainData(ethereum, domainName, domainData);
      }

      for (const [domainName, domainData] of data) {
        const result = registry.getDomainData(ethereum, domainName);
        assert.notStrictEqual(result, domainData);
        assert.deepEqual(result, domainData);
      }
    });

    it("should return undefined if the crypto-asset is not in the registry", () => {
      registry.setDomainData(ethereum, "STANDARD", {});

      const result = registry.getDomainData(bitcoin, "STANDARD");

      assert.isUndefined(result);
    });

    it("should return undefined if there are no metadata attached to that domain", () => {
      registry.setDomainData(ethereum, "STANDARD", {});

      const result = registry.getDomainData(ethereum, "SPECIAL");

      assert.isUndefined(result);
    });
  });
});
