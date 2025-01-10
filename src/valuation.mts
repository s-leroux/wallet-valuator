import { NotImplementedError, IncompatibleUnitsError } from "./error.mjs";
import { BigNumber } from "./bignumber.mjs";
import { FiatCurrency } from "./fiatcurrency.mjs";
import { CryptoAsset } from "./cryptoasset.mjs";
import { Amount } from "./cryptoasset.mjs";
import { Price } from "./price.mjs";
import { Oracle } from "./services/oracle.mjs";

export class Value {
  constructor(readonly fiatCurrency: FiatCurrency, readonly value: BigNumber) {}

  toString(): string {
    return `${this.value} ${this.fiatCurrency}`;
  }
}

export function valueFromAmountAndPrice(amount: Amount, price: Price): Value {
  if (amount.crypto !== price.crypto) {
    throw new IncompatibleUnitsError(amount.crypto, price.crypto);
  }
  return new Value(price.fiatCurrency, BigNumber.mul(amount.value, price.rate));
}

/**
 * Represents the valuation of a set of crypto-assets
 * in terms of a specified fiat currency at a specific point in time.
 */
export class Valuation {
  readonly fiatCurrency: FiatCurrency;
  readonly timeStamp: number;
  readonly holdings: Map<CryptoAsset, Value>;
  readonly totalValue: BigNumber;

  private constructor(
    fiatCurrency: FiatCurrency,
    timeStamp: number,
    holdings: Map<CryptoAsset, Value>
  ) {
    this.fiatCurrency = fiatCurrency;
    this.timeStamp = timeStamp;
    this.holdings = holdings;

    let acc = BigNumber.ZERO;
    for (const value of holdings.values()) {
      acc = acc.plus(value.value); // XXX It is unclear if totalValue should be a BigNumber or a Value
    }
    this.totalValue = acc;
  }

  get(crypto: CryptoAsset): Value {
    return (
      this.holdings.get(crypto) ?? new Value(this.fiatCurrency, BigNumber.ZERO)
    );
  }

  toString(): string {
    return `${this.totalValue} ${this.fiatCurrency}`;
  }

  static async create(
    oracle: Oracle,
    fiatCurrency: FiatCurrency,
    timeStamp: number,
    amounts: Iterable<Amount>
  ): Promise<Valuation> {
    const holdings: Map<CryptoAsset, Value> = new Map();
    const date = new Date(timeStamp * 1000);

    for (const amount of amounts) {
      const crypto = amount.crypto;
      const price = (await oracle.getPrice(crypto, date, [fiatCurrency]))[
        fiatCurrency
      ];
      const value = valueFromAmountAndPrice(amount, price);

      holdings.set(crypto, value);
    }

    return new Valuation(fiatCurrency, timeStamp, holdings);
  }
}
