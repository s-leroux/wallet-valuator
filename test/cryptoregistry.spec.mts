import { assert } from "chai";

import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import {
  CryptoAssetMetadata,
  CryptoMetadata,
  CryptoRegistryNG,
} from "../src/cryptoregistry.mjs";
import { toCryptoAssetID } from "../src/cryptoasset.mjs";

describe("CryptoRegistry", () => {
  let cryptoRegistry: CryptoRegistryNG;

  beforeEach(() => {
    cryptoRegistry = CryptoRegistryNG.create();
  });

  it("should provide a factory function", () => {
    assert.equal(cryptoRegistry.constructor.name, CryptoRegistryNG.name);
    assert.isObject(cryptoRegistry);
  });

  it("should create well known crypto-assets", () => {
    const bitcoin = cryptoRegistry.createCryptoAsset("bitcoin");
    assert.include(bitcoin, {
      id: toCryptoAssetID("bitcoin"),
      name: "Bitcoin",
      decimal: 8,
    });
  });

  it("should create separate instances of crypto-assets across different registries", () => {
    const cryptoRegistry2 = CryptoRegistryNG.create();

    const bitcoin = cryptoRegistry.createCryptoAsset("bitcoin");
    const bitcoin2 = cryptoRegistry2.createCryptoAsset("bitcoin");

    assert.notStrictEqual(bitcoin, bitcoin2);
    assert.deepEqual(bitcoin, bitcoin2); // Same data but different instances
  });
});

describe("CryptoMetadata", () => {
  const { ethereum, bitcoin } = FakeCryptoAsset;

  interface CustomMetadata extends CryptoAssetMetadata {
    x: number;
    y?: string;
    z?: string;
  }

  let cryptoMetadata: CryptoMetadata;

  beforeEach(() => {
    cryptoMetadata = CryptoMetadata.create();
  });

  it("should default to {}", () => {
    const ethereumMetadata = cryptoMetadata.getMetadata(ethereum);
    const bitcoinMetadata = cryptoMetadata.getMetadata(bitcoin);

    assert.deepEqual(ethereumMetadata, {});
    assert.deepEqual(bitcoinMetadata, {});
    assert.notStrictEqual(ethereumMetadata, bitcoinMetadata);
  });

  it("should set and retrieve metadata for a currency", () => {
    const obj: CustomMetadata = { x: 1, y: "abc", resolver: "none" };
    cryptoMetadata.setMetadata(ethereum, obj);

    const result = cryptoMetadata.getMetadata(ethereum);

    assert.notStrictEqual(result, obj);
    assert.deepEqual(result, obj);
  });

  it("should merge new metadata on update", () => {
    const obj1: CustomMetadata = { x: 1, y: "abc", resolver: "none" };
    const obj2: CustomMetadata = { x: 2, z: "xyz", resolver: "none" };
    const union = Object.assign({}, obj1, obj2);

    cryptoMetadata.setMetadata(ethereum, obj1);
    cryptoMetadata.setMetadata(ethereum, obj2);

    const result = cryptoMetadata.getMetadata(ethereum);

    assert.notStrictEqual(result, obj1); // We didn't touch the original objects
    assert.notStrictEqual(result, obj2); // idem
    assert.deepEqual(result, union);
  });
});
