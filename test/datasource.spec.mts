import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { prepare } from "./support/register.helper.mjs";

import type { DataSource } from "../src/coofile.mjs";
import { FakeDataSource } from "./support/datasource.fake.mjs";

describe("DataSource", function () {
  let ds: DataSource<Date, number>;

  beforeEach(function () {
    ds = new FakeDataSource();
  });

  describe("get()", () => {
    describe("should return data", function () {
      const register = prepare(this);

      // pretier-ignore
      const testcases = [
        ["2024-12-04", "EUR", 93_966.82],
        ["2024-12-01", "USD", 95_850.28],
        ["2024-12-08", "GBP", undefined],
        ["2024-11-30", "EUR", undefined],
      ] as const;
      for (const [dateString, fiat, expected] of testcases) {
        const date = new Date(dateString);
        register(`case ${date} ${fiat} => ${expected}`, () => {
          assert.deepEqual(ds.get(date, fiat), expected && [date, expected]);
        });
      }
    });
  });
});
