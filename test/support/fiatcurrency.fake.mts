import { FiatCurrency } from "../../src/fiatcurrency.mjs";

export const FakeFiatCurrency = {
  usd: FiatCurrency("usd"),
  eur: FiatCurrency("eur"),
};
