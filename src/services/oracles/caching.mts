import { Price } from "../../price.mjs";
import { GeckoCoin } from "../../geckocoin.mjs";
import { Provider } from "../../provider.mjs";
import { Oracle } from "../oracle.mjs";

import Database from "better-sqlite3";

const DB_INIT_SEQUENCE = `
CREATE TABLE IF NOT EXISTS prices (
  oracle_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  date TEXT NOT NULL,
  price REAL NOT NULL,
  PRIMARY KEY (oracle_id, currency, date)
);
`;

export class Caching implements Oracle {
  readonly backend: Oracle;
  readonly db: Database.Database;

  // for statistics
  backend_calls: number;

  constructor(backend: Oracle, path: string = ":memory:") {
    this.backend = backend;
    this.backend_calls = 0;
    this.db = new Database(path);
    this.db.exec(DB_INIT_SEQUENCE);
  }

  insert(date: string, prices: Record<string, Price>): void {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO prices(oracle_id, date, currency, price) VALUES (?,?,?,?)"
    );
    for (const price of Object.values(prices)) {
      stmt.run(price.coin.oracle_id, date, price.currency, price.amount);
    }
  }

  async getPrice(
    coin: GeckoCoin,
    date: string,
    currencies: string[]
  ): Promise<Record<string, Price>> {
    const result: Record<string, Price> = {};
    const missing: string[] = [];
    const stmt = this.db.prepare<[string, string, string], { price: number }>(
      "SELECT price FROM prices WHERE oracle_id = ? AND date = ? AND currency = ?"
    );
    for (const currency of currencies) {
      const row = stmt.get(coin.oracle_id, date, currency);
      if (row) {
        result[currency] = new Price(coin, currency, row.price);
      } else {
        missing.push(currency);
      }
    }
    if (missing.length == 0) {
      return result;
    }
    // else
    const new_values = await this.backend.getPrice(coin, date, missing);
    this.backend_calls += 1;
    this.insert(date, new_values);

    return Object.assign(result, new_values);
  }
}
