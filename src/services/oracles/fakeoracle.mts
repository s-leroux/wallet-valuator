import { Oracle } from "../oracle.mjs";
import { CryptoAsset } from "../../cryptoasset.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import { Price } from "../../price.mjs";
import { formatDate } from "../../date.mjs";

// From coingecko v3/coins/currency/history
// for d in $(seq 25 30); do
//   DATE="${d}-12-2024"
//   for f in tmp/"${DATE}"*; do
//     < "$f" jq -c --arg DATE "${DATE}" '[ $DATE, .id, (.market_data.current_price | { eur, usd, btc }) ]'
//   done
// done
import HistoricalPrices from "../../../fixtures/HistoricalPrices.json" assert { type: "json" };

type HistoricalDataRecord = [
  date: string, // dd-mm-yyyy format like in the CoinGecko API
  crypto: string,
  prices: Record<string, number>
];
const DATA = HistoricalPrices as HistoricalDataRecord[];
const CRYPTOS: Record<string, CryptoAsset> = {
  bitcoin: new CryptoAsset("bitcoin", "bitcoin", "BTC", 18),
};

export class FakeOracle {
  constructor() {}

  async getPrice(
    crypto: CryptoAsset,
    date: Date,
    fiat: FiatCurrency[]
  ): Promise<Record<FiatCurrency, Price>> {
    const cryptoId = crypto.id;
    const cryptoAsset = CRYPTOS[cryptoId];
    if (!cryptoAsset) {
      throw new Error(`${cryptoId} is not in the testset`);
    }

    const dateDdMmYyyy = formatDate("DD-MM-YYYY", date);

    const dataRecord = DATA.find(
      (item) => item[0] === dateDdMmYyyy && item[1] === cryptoId
    );
    if (!dataRecord) {
      throw new Error(`No record for ${cryptoId} at ${dateDdMmYyyy}`);
    }
    const prices = dataRecord[2];

    return fiat.reduce((acc, key) => {
      acc[key] = new Price(cryptoAsset, key, prices[key as string]);
      return acc;
    }, {} as Record<FiatCurrency, Price>);
  }

  static create() {
    return new FakeOracle();
  }
}
