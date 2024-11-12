import { Coin } from "./coin.mjs";

export class Price {
  readonly coin: Coin;
  readonly currency: string;
  readonly amount: number;

  constructor(coin: Coin, currency: string, amount: number) {
    this.coin = coin;
    this.currency = currency;
    this.amount = amount;
  }
}
