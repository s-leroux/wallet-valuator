import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";
import type { Price } from "../../price.mjs";

import { NotImplementedError } from "../../error.mjs";
import { formatDate } from "../../date.mjs";
import { BigNumber, BigNumberSource } from "../../bignumber.mjs";
import type { DataSource } from "../../coofile.mjs";
import { CSVFile } from "../../coofile.mjs";
import { Oracle } from "../oracle.mjs";

interface DataSourceOracleOptions {
  dateFormat?: string;
}

export class DataSourceOracle<T extends BigNumberSource> extends Oracle {
  readonly crypto: CryptoAsset;
  readonly data: DataSource<string, T>;
  readonly columMapping: Record<FiatCurrency, string>;

  // option
  readonly dateFormat: string;

  constructor(
    crypto: CryptoAsset,
    data: DataSource<string, T>,
    columMapping: Record<FiatCurrency, string>,
    { dateFormat = "YYYY-MM-DD" } = {}
  ) {
    super();
    this.crypto = crypto;
    this.data = data;
    this.columMapping = columMapping;
    this.dateFormat = dateFormat;
  }

  async getPrice(
    registry: CryptoRegistry,
    crypto: CryptoAsset,
    date: Date,
    fiats: FiatCurrency[]
  ): Promise<Partial<Record<FiatCurrency, Price>>> {
    const result = Object.create(null) as Record<FiatCurrency, Price>;

    // We do not handle that crypto
    if (crypto !== this.crypto) {
      return result;
    }

    const formattedDate = formatDate(this.dateFormat, date);
    // gather the fiat data we have
    for (const fiat of fiats) {
      if (Object.hasOwn(this.columMapping, fiat)) {
        const columnName: string = this.columMapping[fiat];
        const value = this.data.get(formattedDate, columnName)?.at(1);

        if (value !== undefined) {
          result[fiat] = crypto.price(fiat, BigNumber.from(value));
        }
      }
    }

    return result;
  }

  static async createFromPath(
    crypto: CryptoAsset,
    path: string,
    columMapping: Record<FiatCurrency, string>,
    options: DataSourceOracleOptions = {}
  ) {
    const dataSource = await CSVFile.createFromPath(path, BigNumber.from);

    return new DataSourceOracle(crypto, dataSource, columMapping, options);
  }
}
