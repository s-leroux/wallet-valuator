import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import {
  MetadataStore,
  GlobalMetadataStore,
  MetadataFacade,
} from "../src/metadata.mjs";
import { Price } from "../src/price.mjs";
import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "./support/fiatcurrency.fake.mjs";

describe("MetadataStore", () => {
  let registry: MetadataStore;
  let price: Price;

  beforeEach(() => {
    registry = new MetadataStore();
    price = FakeCryptoAsset.bitcoin.price(FakeFiatCurrency.EUR, 1000);
  });

  describe("getMetadata", () => {
    it("should return an empty object for new keys", () => {
      const metadata = registry.getMetadata(price);
      assert.deepEqual(metadata, {});
      assert.isObject(metadata);
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

  describe("GlobalMetadataStore", () => {
    it("should be a singleton instance", () => {
      const registry1 = GlobalMetadataStore;
      const registry2 = GlobalMetadataStore;
      assert.strictEqual(registry1, registry2);
    });

    it("should store and retrieve metadata globally", () => {
      const metadata = { origin: "global" };
      GlobalMetadataStore.setMetadata(price, metadata);
      assert.deepEqual(GlobalMetadataStore.getMetadata(price), metadata);
    });
  });
});

describe("MetadataFacade", () => {
  interface TestMetadata {
    origin: string;
    value?: number;
  }

  let price: Price;

  beforeEach(() => {
    price = FakeCryptoAsset.bitcoin.price(FakeFiatCurrency.EUR, 1000);
  });

  class TestFacade extends MetadataFacade<Price, TestMetadata> {}

  it("should create instances with default global store", () => {
    const facade = TestFacade.create();
    assert.instanceOf(facade, TestFacade);
  });

  it("should create instances with custom store", () => {
    const customStore = new MetadataStore();
    const facade = TestFacade.create(customStore);
    assert.instanceOf(facade, TestFacade);
  });

  it("should delegate metadata operations to store", () => {
    const facade = TestFacade.create();
    const metadata: TestMetadata = { origin: "facade" };

    facade.setMetadata(price, metadata);
    const result = facade.getMetadata(price);

    assert.deepEqual(result, metadata);
  });

  it("should support partial metadata updates", () => {
    const facade = TestFacade.create();
    facade.setMetadata(price, { origin: "initial" });
    facade.setMetadata(price, { value: 42 });

    const result = facade.getMetadata(price);
    assert.deepEqual(result, { origin: "initial", value: 42 });
  });
});
