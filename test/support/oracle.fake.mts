import { Oracle } from "../../src/services/oracle.mjs";
import type { CryptoAsset } from "../../src/cryptoasset.mjs";
import type { CryptoRegistryNG } from "../../src/cryptoregistry.mjs";
import type { FiatCurrency } from "../../src/fiatcurrency.mjs";
import { formatDate } from "../../src/date.mjs";
import type { FiatConverter } from "../../src/services/fiatconverter.mjs";
import type { PriceMap } from "../../src/services/oracle.mjs";
import type { CryptoMetadata } from "../../src/cryptoregistry.mjs";
import { GlobalPriceMetadata } from "../../src/price.mjs";
import {
  baseConfidenceForOrigin,
  DEFAULT_BASE_CONFIDENCE,
} from "../../src/priceconfidence.mjs";

// From coingecko v3/coins/currency/history
// for d in $(seq 25 30); do
//   DATE="${d}-12-2024"
//   for f in tmp/"${DATE}"*; do
//     < "$f" jq -c --arg DATE "${DATE}" '[ $DATE, .id, (.market_data.current_price | { eur, usd, btc }) ]'
//   done
// done
import HistoricalPrices from "../../fixtures/HistoricalPrices.json" with { type: "json" };

type HistoricalDataRecord = [
  date: string, // dd-mm-yyyy format like in the CoinGecko API
  crypto: string,
  prices: Record<string, number>
];
const DATA = HistoricalPrices as HistoricalDataRecord[];

export class FakeOracle extends Oracle {
  async getPrice(
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    crypto: CryptoAsset,
    date: Date,
    fiats: Set<FiatCurrency>,
    result: PriceMap
  ): Promise<void> {
    const cryptoId = crypto.id;
    const dateDdMmYyyy = formatDate("DD-MM-YYYY", date);

    const dataRecord = DATA.find(
      (item) => item[0] === dateDdMmYyyy && item[1] === cryptoId
    );
    if (!dataRecord) {
      throw new Error(`No record for ${cryptoId} at ${dateDdMmYyyy}`);
    }
    const prices = dataRecord[2];

    for (const fiat of fiats) {
      const price = GlobalPriceMetadata.setMetadata(
        crypto.price(fiat, prices[fiat.toString().toLowerCase()]),
        {
          origin: "COINGECKO",
          confidence:
            baseConfidenceForOrigin("COINGECKO") ?? DEFAULT_BASE_CONFIDENCE,
        }
      );
      result.set(fiat, price);
    }
  }

  static create() {
    return new FakeOracle();
  }
}
