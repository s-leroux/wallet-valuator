import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import { ImplicitFiatConverter } from "../../../src/services/fiatconverters/implicitfiatconverter.mjs";
import {
  CryptoRegistryNG,
  CryptoMetadata,
} from "../../../src/cryptoregistry.mjs";
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import { FakeOracle } from "../../support/oracle.fake.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";

describe("ImplicitFiatConverter", function () {
  const { bitcoin, ethereum } = FakeCryptoAsset;
  const { EUR: eur, USD: usd } = FakeFiatCurrency;
  const date = new Date("2024-12-30");
  const error = 0.1;

  let oracle: FakeOracle;
  let converter: ImplicitFiatConverter;
  let cryptoRegistry: CryptoRegistryNG;
  let cryptoMetadata: CryptoMetadata;

  beforeEach(function () {
    oracle = new FakeOracle();
    converter = ImplicitFiatConverter.create(oracle, bitcoin);
    cryptoRegistry = CryptoRegistryNG.create();
    cryptoMetadata = CryptoMetadata.create();
  });

  describe("convert()", () => {
    it(`should convert prices with ±${error}% error`, async () => {
      const priceMap = new Map() as PriceMap;
      await oracle.getPrice(
        cryptoRegistry,
        cryptoMetadata,
        ethereum,
        date,
        new Set([FakeFiatCurrency.EUR, FakeFiatCurrency.USD]),
        priceMap
      );

      assert.isTrue(priceMap.has(eur));
      assert.isTrue(priceMap.has(usd));
      const result = await converter.convert(
        cryptoRegistry,
        date,
        priceMap.get(eur)!,
        FakeFiatCurrency.USD
      );

      assert.strictEqual(result.fiatCurrency, usd);
      assert.strictEqual(result.crypto, ethereum);
      assert.approximately(
        +result.rate.mul(100).div(priceMap.get(usd)!.rate),
        100,
        error
      );
    });
  });
});
