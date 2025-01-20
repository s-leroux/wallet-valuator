import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeOracle } from "../../support/oracle.fake.mjs";
import { FakeFiatConverter } from "../../support/fiatconverter.fake.mjs";
import { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import { Price } from "../../../src/price.mjs";

describe("CSVOracle", function () {
  const fiatConverter = new FakeFiatConverter();

  beforeEach(function () {});

  describe("constructor", () => {
    it("should create from a DataSource");
  });
});
