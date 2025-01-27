import { assert } from "chai";

import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import { Amount, CryptoAsset } from "../src/cryptoasset.mjs";
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

    it("should return undefined if the crypto-asset is not in the registry", () => {
      registry.setDomainData(ethereum, "STANDARD", {});

      const result = registry.getDomainData(bitcoin, "STANDARD");

      assert.isUndefined(result);
    });

    it("should return undefined the donaim names do not match", () => {
      registry.setDomainData(ethereum, "STANDARD", {});

      const result = registry.getDomainData(ethereum, "SPECIAL");

      assert.isUndefined(result);
    });
  });
});
