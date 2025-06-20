import { ValueError } from "../../error.mjs";
import type { CryptoAsset } from "../../cryptoasset.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import type {
  CryptoMetadata,
  CryptoRegistryNG,
} from "../../cryptoregistry.mjs";

import { Table } from "../../bsearch.mjs";

import { ProtocolError } from "../../error.mjs";
import { formatDate } from "../../date.mjs";
import { BigNumber } from "../../bignumber.mjs";
import { Oracle } from "../oracle.mjs";
import { RealTokenAPI, RealTokenEvent } from "./realtokenapi.mjs";
import type { PriceMap } from "../oracle.mjs";
import { RealTokenMetadata } from "./realtokenresolver.mjs";

type RealTokenUUID = string & { readonly brand: unique symbol };
export function RealTokenUUID(uuid: string) {
  // RealTokenUUID are just Ethereum addresses (160 bits hex addresses) , not real UUID (128 bit numbers)
  const result = uuid.toLowerCase();
  if (result.length == 42 && result.startsWith("0x")) {
    return result as RealTokenUUID;
  }

  throw new ValueError(
    `RealToken UUID should be Ethereum addresses: ${uuid} is invalid`
  );
}

type RealTokenPriceTable = Table<string, readonly [string, BigNumber]>;

export class RealTokenOracle extends Oracle {
  readonly history: Map<RealTokenUUID, RealTokenEvent[]>;
  readonly priceTables: Map<RealTokenUUID, RealTokenPriceTable>;

  private constructor(readonly api: RealTokenAPI) {
    super();

    this.history = new Map();
    this.priceTables = new Map();
  }

  /**
   *  Lazzy-load raw data from the API. Convert the result array as a Map for fast retrieval
   *  but do not decode individual history items. This is defered to, and done one demand by, `getEvent` method
   */
  async load() {
    if (this.history.size) {
      // apparently the history was already loaded in cache.
      throw new ProtocolError("Method load() can only be called once");
    }

    const history = await this.api.tokenHistory();
    for (const token of history) {
      this.history.set(RealTokenUUID(token.uuid), token.history);
    }
  }

  getEvents(uuid: RealTokenUUID): RealTokenEvent[] {
    if (!this.history.size) {
      throw new ProtocolError("You must call load() before using this method");
    }

    return this.history.get(uuid) ?? [];
  }

  getPriceTable(uuid: RealTokenUUID): RealTokenPriceTable {
    let priceTable = this.priceTables.get(uuid);
    if (priceTable) {
      return priceTable;
    }

    const events = this.getEvents(uuid);
    const it = function* () {
      for (const event of events) {
        const { tokenPrice } = event.values;
        if (tokenPrice !== undefined) {
          yield [event.date, BigNumber.from(tokenPrice)] as const;
        }
      }
    };
    priceTable = new Table(it());
    this.priceTables.set(uuid, priceTable);

    return priceTable;
  }

  async getPrice(
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    crypto: CryptoAsset,
    date: Date,
    fiats: Set<FiatCurrency>,
    result: PriceMap
  ): Promise<void> {
    const metadata = cryptoMetadata.getMetadata<RealTokenMetadata>(crypto);

    if (!metadata) {
      // We do not handle that crypto
      return;
    }

    for (const fiat of fiats) {
      if (fiat === FiatCurrency("USD")) {
        // check data are loaded before all
        await this.load();

        const uuid = RealTokenUUID(metadata["realtoken.uuid"] as string);
        const priceTable = this.getPriceTable(uuid);
        const entry = priceTable.get(formatDate("YYYYMMDD", date));
        if (entry) {
          result.set(fiat, crypto.price(fiat, entry[1]));
        }
        // If the price is unavailable for the requested date, default to `{}`
        // in accordance with the discussion in:
        // https://github.com/s-leroux/wallet-valuator/issues/27#issuecomment-2624872047
        // and the description provided in `src/services/oracle.mts`.
        break;
      }
    }
  }

  static create(api: RealTokenAPI) {
    return new RealTokenOracle(api);
  }
}
