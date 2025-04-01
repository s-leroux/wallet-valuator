import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { CurveOracle } from "../../../src/services/curve/curveoracle.mjs";
import { parseDate } from "../../../src/date.mjs";
import { CryptoAsset } from "../../../src/cryptoasset.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";

import { prepare } from "../../support/register.helper.mjs";

import { FakeCurveAPI } from "../../support/curveapi.fake.mjs";
import type { CurveMetadata } from "../../../src/services/curve/curveoracle.mjs";
import { FiatConverter } from "../../../src/services/fiatconverter.mjs";
import { FixedFiatConverter } from "../../support/fiatconverter.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import { ChainAddress } from "../../../src/chainaddress.mjs";

const { EUR, USD } = FakeFiatCurrency;
const RATE = 1.2;

describe("CurveOracle", function () {
  let api: FakeCurveAPI;
  let oracle: CurveOracle;
  let fiatConverter: FiatConverter;

  beforeEach(function () {
    api = FakeCurveAPI.create();
    oracle = CurveOracle.create(api);
    fiatConverter = FixedFiatConverter.create(USD, EUR, RATE);
  });

  describe("getPrice", function () {
    const CHAIN = "ethereum";
    const TOKEN = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6e490";

    describe("should retrieve the token price in USD", async function () {
      const register = prepare(this);

      const testcases = [
        ["20250228", null], // this tests the case we have a konwn token but no price at the requested date
        ["20250301", 1.039576024649618],
        ["20250302", 1.0397308967364007],
        ["20250303", 1.039882229160477],
        ["20250304", 1.0397390287401556],
        ["20250305", 1.0399812908886852],
      ] as const;

      const ID = ChainAddress(CHAIN, TOKEN);
      const crypto = new CryptoAsset(ID, "Curve-X", "Curve-X", 18);
      for (const [date, value] of testcases) {
        register(`case ${date}`, async () => {
          const registry = CryptoRegistry.create();
          const metadata: CurveMetadata = {
            chain: "ethereum",
            address: TOKEN,
          };
          registry.setNamespaceData(crypto, "CURVE", metadata);

          const prices = await oracle
            .getPrice(
              registry,
              crypto,
              parseDate("YYYYMMDD", date),
              [USD, EUR],
              fiatConverter
            )
            .catch((err) => (console.log(err.message), {}));

          assert.deepEqual(
            prices,
            value === null
              ? {}
              : {
                  [USD]: crypto.price(USD, value),
                  [EUR]: crypto.price(EUR, value).mul(RATE),
                }
          );
        });
      }
    });
  });
});
