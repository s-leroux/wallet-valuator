import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import { FakeFiatConverter } from "../../support/fiatconverter.fake.mjs";
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeOracle } from "../../support/oracle.fake.mjs";

import { ImplicitFiatConverter } from "../../../src/services/fiatconverters/implicitfiatconverter.mjs";

describe("ImplicitFiatConverter", function () {
  const oracle = new FakeOracle();
  const fiatConverter = new FakeFiatConverter();
  const { bitcoin, ethereum } = FakeCryptoAsset;
  const { eur, usd } = FakeFiatCurrency;
  const date = new Date("2024-12-10");

  it("can be created", function () {
    const converter = new ImplicitFiatConverter(oracle, bitcoin);
    assert.strictEqual(converter.oracle, oracle);
    assert.strictEqual(converter.crypto, bitcoin);
  });

  describe("convert()", function () {
    const converter = new ImplicitFiatConverter(oracle, bitcoin);
    const error = 0.1; // acceptable error in %

    it(`should convert prices with ±${error}% error`, async () => {
      const prices = await oracle.getPrice(fiatConverter, ethereum, date, [
        FakeFiatCurrency.eur,
        FakeFiatCurrency.usd,
      ]);

      const result = await converter.convert(
        date,
        prices[eur],
        FakeFiatCurrency.usd
      );

      assert.strictEqual(result.fiatCurrency, usd);
      assert.strictEqual(result.crypto, ethereum);
      assert.approximately((100 * result.rate) / prices[usd].rate, 100, error);
    });
  });
});
