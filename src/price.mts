import { GeckoCoin } from "./geckocoin.mjs";

export class Price {
  readonly coin: GeckoCoin;
  readonly currency: string;
  readonly amount: number;

  constructor(coin: GeckoCoin, currency: string, amount: number) {
    this.coin = coin;
    this.currency = currency;
    this.amount = amount;
  }
}
