import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { MetadataRegistry, GlobalMetadataRegistry } from "../src/metadata.mjs";
import { Price } from "../src/price.mjs";
import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "./support/fiatcurrency.fake.mjs";

describe("MetadataRegistry", () => {
  let registry: MetadataRegistry;
  let price: Price;

  beforeEach(() => {
    registry = new MetadataRegistry();
    price = FakeCryptoAsset.bitcoin.price(FakeFiatCurrency.EUR, 1000);
  });

  describe("getMetadata", () => {
    it("should return undefined for non-existent metadata", () => {
      const metadata = registry.getMetadata(price);
      assert.equal(metadata, undefined);
    });

    it("should return stored metadata for an object", () => {
      const metadata = { origin: "test" };
      registry.setMetadata(price, metadata);
      assert.deepEqual(registry.getMetadata(price), metadata);
    });
  });

  describe("setMetadata", () => {
    it("should store metadata for a Price object", () => {
      const metadata = { origin: "test" };
      registry.setMetadata(price, metadata);
      assert.deepEqual(registry.getMetadata(price), metadata);
    });

    it("should merge partial metadata with existing metadata", () => {
      registry.setMetadata(price, { origin: "initial" });
      registry.setMetadata(price, { origin: "updated" });
      assert.deepEqual(registry.getMetadata(price), { origin: "updated" });
    });
  });

  describe("GlobalMetadataRegistry", () => {
    it("should be a singleton instance", () => {
      const registry1 = GlobalMetadataRegistry;
      const registry2 = GlobalMetadataRegistry;
      assert.strictEqual(registry1, registry2);
    });

    it("should store and retrieve metadata globally", () => {
      const metadata = { origin: "global" };
      GlobalMetadataRegistry.setMetadata(price, metadata);
      assert.deepEqual(GlobalMetadataRegistry.getMetadata(price), metadata);
    });
  });
});
