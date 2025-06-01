import { assert } from "chai";

import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import { CryptoRegistry } from "../src/cryptoregistry.mjs";
import { toCryptoAssetID } from "../src/cryptoasset.mjs";

describe("CryptoRegistry", () => {
  const { ethereum, bitcoin } = FakeCryptoAsset;

  it("should provide a factory function", () => {
    const registry = CryptoRegistry.create();

    assert.equal(registry.constructor.name, CryptoRegistry.name);
  });

  describe("metadata", () => {
    let registry: CryptoRegistry;
    beforeEach(() => {
      registry = CryptoRegistry.create();
      registry.registerCryptoAsset(ethereum);
    });

    it("should assign a STANDARD metadata to registered cryptoassets", () => {
      assert.isDefined(registry.getNamespaceData(ethereum, "STANDARD"));
    });

    it("should create well known crypto-assets", () => {
      const bitcoin = registry.createCryptoAsset("bitcoin");
      assert.include(bitcoin, {
        id: toCryptoAssetID("bitcoin"),
        name: "Bitcoin",
        decimal: 8,
      });
    });
  });

  describe("behaviour", () => {
    let registry: CryptoRegistry;
    const namespace = "TEST";

    beforeEach(() => {
      registry = CryptoRegistry.create();
    });

    it("should set and retrieve metadata for a currency", () => {
      const obj = { x: 1, y: "abc" };
      registry.setNamespaceData(ethereum, namespace, obj);

      const result = registry.getNamespaceData(ethereum, namespace);

      assert.notStrictEqual(result, obj);
      assert.deepEqual(result, obj);
    });

    it("should replace metadata for existing domain", () => {
      const obj1 = { x: 1, y: "abc" };
      const obj2 = { x: 2, y: "xyz" };
      registry.setNamespaceData(ethereum, namespace, obj1);
      registry.setNamespaceData(ethereum, namespace, obj2);

      const result = registry.getNamespaceData(ethereum, namespace);

      assert.notStrictEqual(result, obj2);
      assert.deepEqual(result, obj2);
    });

    it("should accept multiple domain metadata", () => {
      const data = [
        [namespace, { x: 1, y: "abc" }],
        ["SPECIAL", { x: 2, y: "xyz" }],
      ] as const;

      for (const [domainName, domainData] of data) {
        registry.setNamespaceData(ethereum, domainName, domainData);
      }

      for (const [domainName, domainData] of data) {
        const result = registry.getNamespaceData(ethereum, domainName);
        assert.notStrictEqual(result, domainData);
        assert.deepEqual(result, domainData);
      }
    });

    it("should return undefined if the crypto-asset is not in the registry", () => {
      registry.setNamespaceData(ethereum, namespace, {});

      const result = registry.getNamespaceData(bitcoin, namespace);

      assert.isUndefined(result);
    });

    it("should return undefined if there are no metadata attached to that domain", () => {
      registry.setNamespaceData(ethereum, namespace, {});

      const result = registry.getNamespaceData(ethereum, "SPECIAL");

      assert.isUndefined(result);
    });
  });
});
