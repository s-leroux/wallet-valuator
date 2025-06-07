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
      [eur, eur, true],
      [usd, eur, false],
      // direct comparison with string is no longer supported and should
      // be flagged by the linter
      // [usd, "USD", true],
      // [usd, "EUR", false],
      // ["USD", usd, true],
      // ["EUR", usd, false],
      [usd, FiatCurrency("USD"), true],
      [usd, FiatCurrency("usd"), true],
      [usd, FiatCurrency("Usd"), true],
      [usd, FiatCurrency("EUR"), false],
    ] as const;

    for (const [a, b, expected] of testcases) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
      register(`case "${a}" "${b}"`, () => {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const fct = expected ? assert.strictEqual : assert.notEqual;
        fct(a, b);
        fct(b, a); // FIXED #69
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
