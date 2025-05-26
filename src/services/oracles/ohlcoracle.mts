import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";
import type { Price } from "../../price.mjs";

import { formatDate } from "../../date.mjs";
import { BigNumber, BigNumberSource } from "../../bignumber.mjs";
import type { DataSource } from "../../csvfile.mjs";
import { CSVFile } from "../../csvfile.mjs";
import { Oracle } from "../oracle.mjs";
import { logger } from "../../debug.mjs";

const log = logger("ohlcoracle");

interface OHLCOracleOptions {
  dateFormat?: string;
}

/**
 * A class to read OHLC data source.
 * First column is assumed to be the date
 * Columns are assumed to be named "open", "high, "low", and "close"
 */
export class OHLCOracle<T extends BigNumberSource> extends Oracle {
  // option
  readonly dateFormat: string;

  constructor(
    readonly crypto: CryptoAsset,
    readonly fiat: FiatCurrency,
    readonly data: DataSource<string, T>,
    options: OHLCOracleOptions = {}
  ) {
    super();
    this.dateFormat = options.dateFormat ?? "YYYY-MM-DD";
  }

  async getPrice(
    registry: CryptoRegistry,
    crypto: CryptoAsset,
    date: Date,
    fiats: FiatCurrency[]
  ): Promise<Partial<Record<FiatCurrency, Price>>> {
    const result = Object.create(null) as Record<FiatCurrency, Price>;

    // We do not handle that crypto
    if (crypto !== this.crypto || !fiats.includes(this.fiat)) {
      return result;
    }

    const formattedDate = formatDate(this.dateFormat, date);

    // Estimate the fair price from OHLC data using the common fair value estimate
    // Typical Price = (High + Low + Close) / 3
    // XXX These multiple calls are highly inefficient. Change Datasource.get to accept several column specifiers.
    const high = this.data.get(formattedDate, "High");
    const low = this.data.get(formattedDate, "Low");
    const close = this.data.get(formattedDate, "Close");

    if (high && low && close) {
      result[this.fiat] = crypto.price(
        this.fiat,
        BigNumber.sum(high[1], low[1], close[1]).div(3)
      );
    } else {
      log.trace("C1011", `Date not found: ${formattedDate}`);
    }

    return result;
  }

  static async createFromPath(
    crypto: CryptoAsset,
    fiat: FiatCurrency,
    path: string,
    options: OHLCOracleOptions = {}
  ) {
    const dataSource = await CSVFile.createFromPath(
      path,
      String,
      BigNumber.from
    );

    return new OHLCOracle(crypto, fiat, dataSource, options);
  }
}
