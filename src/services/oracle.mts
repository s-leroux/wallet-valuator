import { Coin } from "../coin.mjs";
import { Price } from "../price.mjs";

export interface Oracle {
  getPrice(
    coin: Coin,
    date: string,
    currencies: string[]
  ): Promise<Record<string, Price>>;
}

export function mangle(platform: string, contract: string) {
  return `${platform}/${contract.toLowerCase()}`;
}
