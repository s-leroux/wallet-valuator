import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { FiatConverter } from "../fiatconverter.mjs";
import type { Price } from "../../price.mjs";

import { NotImplementedError } from "../../error.mjs";
import { formatDate } from "../../date.mjs";
import { BigNumber, BigNumberSource } from "../../bignumber.mjs";
import { CSVFile } from "../../coofile.mjs";
import { Oracle } from "../oracle.mjs";

interface CSVOracleOptions {
  dateFormat?: string;
}

export class CSVOracle<T extends BigNumberSource> extends Oracle {
  readonly crypto: CryptoAsset;
  readonly data: CSVFile<T>;
  readonly columMapping: Record<FiatCurrency, string>;

  // option
  readonly dateFormat: string;

  constructor(
    crypto: CryptoAsset,
    data: CSVFile<T>,
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
    converter: FiatConverter, // oracles may use that if they do not have the data for a required currency
    crypto: CryptoAsset,
    date: Date,
    fiats: FiatCurrency[]
  ): Promise<Record<FiatCurrency, Price>> {
    const result = {} as Record<FiatCurrency, Price>;

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
          result[fiat] = crypto.price(fiat, BigNumber.from(value).toNumber()); // TODO Should be simplified as part of ISSUE #39
        }
      }
    }

    return result;
  }
}
