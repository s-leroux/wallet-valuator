import { FiatCurrency } from "./fiatcurrency.mjs";
import { Amount } from "./cryptoasset.mjs";
import { Oracle } from "./services/oracle.mjs";

type Price = number;

/**
 * Represents the valuation of a set of crypto-assets
 * in terms of a specified fiat currency at a specific point in time.
 */
export class Valuation {
  readonly timeStamp: number;
  readonly fiatCurrency: FiatCurrency;
  readonly holdings: Map<Amount, Price>;
  readonly totalValue: number;

  constructor(
    oracle: Oracle,
    timeStamp: number,
    fiatCurrency: FiatCurrency,
    holdings: Iterable<Amount>
  ) {
    this.timeStamp = timeStamp;
    this.fiatCurrency = fiatCurrency;
    this.holdings = new Map();
  }
}
