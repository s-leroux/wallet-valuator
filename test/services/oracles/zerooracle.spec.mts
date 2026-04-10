import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import {
  CryptoMetadata,
  CryptoRegistryNG,
} from "../../../src/cryptoregistry.mjs";
import { Fixed } from "../../../src/bignumber.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";
import { ZeroOracle } from "../../../src/services/oracles/zerooracle.mjs";

describe("ZeroOracle", function () {
  let oracle: ZeroOracle;
  let cryptoRegistry: CryptoRegistryNG;
  let cryptoMetadata: CryptoMetadata;

  beforeEach(function () {
    oracle = new ZeroOracle();
    cryptoRegistry = CryptoRegistryNG.create();
    cryptoMetadata = CryptoMetadata.create();
  });

  describe("getPrice()", () => {
    it("should set a zero rate for every requested fiat", async function () {
      const crypto = FakeCryptoAsset.bitcoin;
      const { EUR, USD } = FakeFiatCurrency;
      const fiats = new Set([USD, EUR]);
      const priceMap = new Map() as PriceMap;

      await oracle.getPrice(
        cryptoRegistry,
        cryptoMetadata,
        crypto,
        new Date("2024-06-01"),
        fiats,
        priceMap,
      );

      assert.equal(priceMap.size, 2);
      const zero = Fixed.fromInteger(0);
      for (const fiat of fiats) {
        const price = priceMap.get(fiat);
        assert.exists(price);
        assert.isTrue(price.rate.equals(zero), `rate for ${fiat.code}`);
        assert.equal(price.crypto, crypto);
        assert.equal(price.fiatCurrency, fiat);
      }
    });
  });
});
