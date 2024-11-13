import { Coin } from "../coin.mjs";
import { Price } from "../price.mjs";

export interface Oracle {
  getPrice(
    coin: Coin,
    date: Date,
    currencies: string[]
  ): Promise<Record<string, Price>>;
}

export function mangle(platform, contract) {
  return `${platform}/${contract.toLowerCase()}`;
}
