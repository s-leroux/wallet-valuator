import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { FiatCurrency, FiatCurrencyCode } from "../../fiatcurrency.mjs";
import type { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import type { CryptoMetadata } from "../../cryptoregistry.mjs";

import { formatDate } from "../../date.mjs";
import { BigNumber, BigNumberSource } from "../../bignumber.mjs";
import type { DataSource } from "../../csvfile.mjs";
import { CSVFile } from "../../csvfile.mjs";
import { Oracle, PriceMap } from "../oracle.mjs";

interface DataSourceOracleOptions {
  dateFormat?: string;
}

export class DataSourceOracle<T extends BigNumberSource> extends Oracle {
  readonly crypto: CryptoAsset;
  readonly data: DataSource<string, T>;
  readonly columMapping: Record<FiatCurrencyCode, string>;

  // option
  readonly dateFormat: string;

  constructor(
    crypto: CryptoAsset,
    data: DataSource<string, T>,
    columMapping: Record<FiatCurrencyCode, string>,
    { dateFormat = "YYYY-MM-DD" } = {}
  ) {
    super();
    this.crypto = crypto;
    this.data = data;
    this.columMapping = columMapping;
    this.dateFormat = dateFormat;
  }

  async getPrice(
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    crypto: CryptoAsset,
    date: Date,
    fiats: Set<FiatCurrency>,
    result: PriceMap
  ): Promise<void> {
    // We do not handle that crypto
    if (crypto !== this.crypto) {
      return;
    }

    const formattedDate = formatDate(this.dateFormat, date);
    // gather the fiat data we have
    for (const fiat of fiats) {
      if (Object.hasOwn(this.columMapping, fiat.code)) {
        const columnName: string = this.columMapping[fiat.code];
        const value = this.data.get(formattedDate, columnName)?.at(1);

        if (value !== undefined) {
          result.set(fiat, crypto.price(fiat, BigNumber.from(value)));
        }
      }
    }
  }

  static async createFromPath(
    crypto: CryptoAsset,
    path: string,
    columMapping: Record<FiatCurrencyCode, string>,
    options: DataSourceOracleOptions = {}
  ) {
    const dataSource = await CSVFile.createFromPath(
      path,
      String,
      BigNumber.from
    );

    return new DataSourceOracle(crypto, dataSource, columMapping, options);
  }
}
