import { assert } from "chai";

import { ValueError } from "../src/error.mjs";
import { prepare } from "./support/register.helper.mjs";

import { FiatCurrency } from "../src/fiatcurrency.mjs";

describe("FiatCurrency", () => {
  it("can be created from string", () => {
    const cny = FiatCurrency("CNY");
  });

  describe("are comparable-by-value primitive types", function () {
    const register = prepare(this);
    const eur = FiatCurrency("EUR");
    const usd = FiatCurrency("USD");

    // prettier-ignore
    const testcases = [
      [usd, usd, true],
      [usd, eur, false],
      [usd, "USD", true],
      [usd, "EUR", false],
      ["USD", usd, true],
      ["EUR", usd, false],
      [usd, FiatCurrency("USD"), true],
      [usd, FiatCurrency("EUR"), false],
    ];
    for (const [a, b, expected] of testcases) {
      register(`case "${a}" "${b}"`, () => {
        // ISSUE #69 Check if this test should be asymmetric: === vs !=
        (expected ? assert.strictEqual : assert.notEqual)(a, b);
      });
    }
  });

  describe("conforms to ISO 4217 codes", () => {
    describe("should convert code to uppercases", function () {
      const register = prepare(this);
      // prettier-ignore
      const testcases = [
        ["cny"],
        ["Cny"],
        ["cNy"],
        ["cnY"],
        ["CNy"],
        ["CnY"],
        ["cNY"],
        ["CNY"],
      ];
      for (const [a] of testcases) {
        register(`case FiatCurrrency("${a}") === "CNY"`, () => {
          assert.strictEqual(FiatCurrency(a), FiatCurrency("CNY"));
        });
      }
    });

    describe("should throw an error if the currency string is ill-formed", function () {
      const register = prepare(this);
      // prettier-ignore
      const testcases = [
        [""],
        ["a"],
        ["A"],
        ["AB"],
        ["ab"],
        ["ABCD"],
        ["abcd"],
      ];
      for (const [a] of testcases) {
        register(`case FiatCurrrency("${a}")`, () => {
          assert.throws(() => FiatCurrency(a), ValueError);
        });
      }
    });
  });
});
