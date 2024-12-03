import { BigNumber } from "./bignumber.mjs";

type CurrencyLike = {
  readonly chain: string;
  readonly address: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimal: number;
};

export class Amount {
  currency: CurrencyLike;
  value: BigNumber;

  constructor(currency: CurrencyLike, value: BigNumber) {
    this.currency = currency;
    this.value = value;
  }

  toString() {
    return `${this.value} ${this.currency.symbol}`;
  }
}

export class Currency {
  readonly chain: string;
  readonly address: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimal: number;

  constructor(
    chain: string,
    address: string,
    name: string,
    symbol: string,
    decimal: number
  ) {
    this.chain = chain;
    this.address = address;
    this.name = name;
    this.symbol = symbol;
    this.decimal = decimal;
  }

  fromBaseUnit(baseunit: string): Amount {
    return new Amount(this, BigNumber.fromDigits(baseunit, this.decimal));
  }
}
