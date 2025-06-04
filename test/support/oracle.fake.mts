import { Oracle } from "../../src/services/oracle.mjs";
import type { CryptoAsset } from "../../src/cryptoasset.mjs";
import type { CryptoRegistry } from "../../src/cryptoregistry.mjs";
import type { FiatCurrency } from "../../src/fiatcurrency.mjs";
import type { Price } from "../../src/price.mjs";
import { formatDate } from "../../src/date.mjs";

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
    registry: CryptoRegistry,
    crypto: CryptoAsset,
    date: Date,
    fiat: FiatCurrency[]
  ): Promise<Partial<Record<FiatCurrency, Price>>> {
    const cryptoId = crypto.id;
    const dateDdMmYyyy = formatDate("DD-MM-YYYY", date);

    const dataRecord = DATA.find(
      (item) => item[0] === dateDdMmYyyy && item[1] === cryptoId
    );
    if (!dataRecord) {
      throw new Error(`No record for ${cryptoId} at ${dateDdMmYyyy}`);
    }
    const prices = dataRecord[2];

    return fiat.reduce((acc, key) => {
      acc[key] = crypto.price(key, prices[key.toLowerCase()]);
      return acc;
    }, {} as Record<FiatCurrency, Price>);
  }

  static create() {
    return new FakeOracle();
  }
}
