import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { OHLCOracle } from "../../../src/services/oracles/ohlcoracle.mjs";
import { CSVFile } from "../../../src/csvfile.mjs";
import { BigNumber } from "../../../src/bignumber.mjs";
import { prepare } from "../../support/register.helper.mjs";
import { PriceMap } from "../../../src/services/oracle.mjs";

chai.use(chaiAsPromised);
const assert = chai.assert;

// From Yahoo! Finance data, quotes removed, and using semi-colon as the separator
// sed -e '1s/,/;/g' -e 's/","/";"/g' -e 's/"//g' -e 's/,\([0-9]\)/\1/g'
const CSV_DATA = `Date;Open;High;Low;Close;Adj Close;Volume
May 26, 2025;109020.80;110193.42;108803.85;109703.75;109703.75;47272984576
May 25, 2025;107802.27;109313.30;106683.38;109035.39;109035.39;47518041841
May 24, 2025;107278.51;109454.52;106895.29;107791.16;107791.16;45903627163
May 23, 2025;111679.36;111798.91;106841.30;107287.80;107287.80;67548133399
May 22, 2025;109673.49;111970.17;109285.07;111673.28;111673.28;70157575642
May 21, 2025;106791.31;110724.46;106127.23;109678.08;109678.08;78086364051
May 20, 2025;105605.41;107307.12;104206.52;106791.09;106791.09;36515726122
May 19, 2025;106430.53;107068.72;102112.69;105606.18;105606.18;61761126647
May 18, 2025;103186.95;106597.17;103142.60;106446.01;106446.01;49887082058
`;

describe("OHLCOracle", function () {
  const { USD } = FakeFiatCurrency;
  let oracle: OHLCOracle<BigNumber>;
  const registry = CryptoRegistry.create();
  const bitcoin = registry.createCryptoAsset("bitcoin");

  beforeEach(() => {
    const datasource = CSVFile.createFromText(
      CSV_DATA,
      String,
      BigNumber.from,
      {
        separator: ";",
      }
    );
    oracle = new OHLCOracle(bitcoin, USD, datasource, {
      dateFormat: "MMM D, YYYY",
    });
  });

  describe("getPrice()", () => {
    describe("should return the fair price at date", async function () {
      const register = prepare(this);

      const testCases = [
        ["2025-05-20", "106101.5766"],
        ["2025-05-26", "109567.0066"],
        ["2025-05-23", "108642.6700"],
        ["2025-05-18", "105395.2600"],
      ] as const;

      for (const [date, expected] of testCases) {
        register(`case ${date}`, async () => {
          const priceMap = new Map() as PriceMap;
          await oracle.getPrice(
            registry,
            bitcoin,
            new Date(date),
            new Set([USD]),
            priceMap
          );
          const price = priceMap.get(USD);
          if (!price) {
            assert.fail(`price not found`);
          } else {
            assert.equal(price.rate.toFixed(4), expected);
            assert.equal(price.fiatCurrency, USD);
            assert.equal(price.crypto, bitcoin);
          }
        });
      }
    });
  });
});
