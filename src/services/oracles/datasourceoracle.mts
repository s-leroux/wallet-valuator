import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { FiatCurrency, FiatCurrencyCode } from "../../fiatcurrency.mjs";
import type { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import type { CryptoMetadata } from "../../cryptoregistry.mjs";

import { formatDate } from "../../date.mjs";
import { BigNumber, BigNumberSource } from "../../bignumber.mjs";
import type { DataSource } from "../../csvfile.mjs";
import { CSVFile } from "../../csvfile.mjs";
import { Oracle, PriceMap } from "../oracle.mjs";
import { GlobalMetadataStore } from "../../metadata.mjs";

interface DataSourceOracleOptions {
  dateFormat?: string;
  confidence?: number;
  origin?: string;
}

export class DataSourceOracle<T extends BigNumberSource> extends Oracle {
  readonly crypto: CryptoAsset;
  readonly data: DataSource<string, T>;
  readonly columMapping: Record<FiatCurrencyCode, string>;

  // option
  readonly dateFormat: string;
  readonly confidence: number;
  readonly origin: string;

  constructor(
    crypto: CryptoAsset,
    data: DataSource<string, T>,
    columMapping: Record<FiatCurrencyCode, string>,
    { dateFormat = "YYYY-MM-DD", confidence = 0.85, origin = "YAHOO" } = {}
  ) {
    super();
    this.crypto = crypto;
    this.data = data;
    this.columMapping = columMapping;
    this.dateFormat = dateFormat;
    this.confidence = confidence;
    this.origin = origin;
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
          const price = crypto.price(
            fiat,
            BigNumber.from(value),
            this.confidence
          );
          GlobalMetadataStore.setMetadata(price, {
            origin: this.origin,
            confidence: this.confidence,
          });
          result.set(fiat, price);
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
