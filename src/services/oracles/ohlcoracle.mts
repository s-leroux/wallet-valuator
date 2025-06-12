import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoRegistryNG } from "../../cryptoregistry.mjs";

import { formatDate } from "../../date.mjs";
import { BigNumber, BigNumberSource } from "../../bignumber.mjs";
import type { CSVFileOptionBag, DataSource } from "../../csvfile.mjs";
import { CSVFile } from "../../csvfile.mjs";
import { Oracle } from "../oracle.mjs";
import { logger } from "../../debug.mjs";
import { GlobalMetadataStore } from "../../metadata.mjs";
import type { FiatConverter } from "../fiatconverter.mjs";
import type { PriceMap } from "../oracle.mjs";
import type { CryptoMetadata } from "../../cryptoregistry.mjs";

const log = logger("ohlc-oracle");

interface OHLCOracleOptions {
  dateFormat?: string;
  origin?: string;
}

/**
 * A class to read OHLC data source.
 * First column is assumed to be the date
 * Columns are assumed to be named "open", "high, "low", and "close"
 */
export class OHLCOracle<T extends BigNumberSource> extends Oracle {
  // option
  readonly dateFormat: string;
  readonly origin: string;

  constructor(
    readonly crypto: CryptoAsset,
    readonly fiat: FiatCurrency,
    readonly data: DataSource<string, T>,
    options: OHLCOracleOptions = {}
  ) {
    super();
    this.dateFormat = options.dateFormat ?? "YYYY-MM-DD";
    this.origin = options.origin?.toLocaleUpperCase() ?? "OHLC";
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
    if (crypto !== this.crypto || !fiats.has(this.fiat)) {
      log.debug(
        "Not our business",
        crypto !== this.crypto,
        fiats.has(this.fiat)
      );
      return;
    }

    const formattedDate = formatDate(this.dateFormat, date);

    // Estimate the fair price from OHLC data using the common fair value estimate
    // Typical Price = (High + Low + Close) / 3
    // ISSUE #114 These multiple calls are highly inefficient. Change Datasource.get to accept several column specifiers.
    const [_, high, low, close] =
      this.data.getMany(formattedDate, ["High", "Low", "Close"]) ?? [];

    if (high && low && close) {
      const price = crypto.price(
        this.fiat,
        BigNumber.sum(high, low, close).div(3)
      );
      GlobalMetadataStore.setMetadata(price, { origin: this.origin });
      result.set(this.fiat, price);
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      log.trace("C1012", `Found ${price} at ${formattedDate}`);
    } else {
      log.trace("C1011", `Date not found: ${formattedDate}`);
    }
  }

  static async createFromPath(
    crypto: CryptoAsset,
    fiat: FiatCurrency,
    path: string,
    options: OHLCOracleOptions & CSVFileOptionBag = {}
  ) {
    const dataSource = await CSVFile.createFromPath(
      path,
      String,
      BigNumber.from,
      options
    );

    return new OHLCOracle(crypto, fiat, dataSource, options);
  }
}
