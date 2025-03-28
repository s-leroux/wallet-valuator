import { FiatCurrency } from "../../src/fiatcurrency.mjs";

export const FakeFiatCurrency = {
  USD: FiatCurrency("usd"),
  EUR: FiatCurrency("eur"),
};
