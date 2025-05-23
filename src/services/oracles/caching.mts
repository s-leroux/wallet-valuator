import type { CryptoAsset } from "../../cryptoasset.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";
import type { FiatCurrency } from "../../fiatcurrency.mjs";
import { Price } from "../../price.mjs";
import type { Oracle } from "../oracle.mjs";

import { logger as logger } from "../../debug.mjs";
const log = logger("provider");

import Database from "better-sqlite3";
import { FiatConverter } from "../fiatconverter.mjs";

const DB_INIT_SEQUENCE = `
CREATE TABLE IF NOT EXISTS prices (
  oracle_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  date TEXT NOT NULL,
  price REAL NOT NULL,
  PRIMARY KEY (oracle_id, currency, date)
);
`;

export class Caching {
  readonly backend: Oracle;
  readonly db: Database.Database;

  // for statistics
  backend_calls: number;

  constructor(backend: Oracle, path: string | undefined) {
    path ??= ":memory:";

    this.backend = backend;
    this.backend_calls = 0;
    try {
      this.db = new Database(path);
    } catch (err) {
      log.error(
        "C3005",
        `Cannot open the database ${path}`,
        `(${process.cwd()})`
      );
      throw err;
    }
    this.db.exec(DB_INIT_SEQUENCE);
  }

  insert(date: string, prices: Partial<Record<string, Price>>): void {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO prices(oracle_id, date, currency, price) VALUES (?,?,?,?)"
    );
    for (const price of Object.values(prices)) {
      stmt.run(
        price!.crypto.id,
        date,
        price!.fiatCurrency,
        price!.rate.toFixed()
      );
    }
  }

  async getPrice(
    registry: CryptoRegistry,
    crypto: CryptoAsset,
    date: Date,
    currencies: FiatCurrency[],
    fiatConverter: FiatConverter
  ): Promise<Partial<Record<string, Price>>> {
    const result: Record<string, Price> = Object.create(null);
    const dateYyyyMmDd = date.toISOString().substring(0, 10);
    const missing: FiatCurrency[] = [];
    const stmt = this.db.prepare<[string, string, string], { price: number }>(
      "SELECT price FROM prices WHERE oracle_id = ? AND date = ? AND currency = ?"
    );
    for (const currency of currencies) {
      const row = stmt.get(crypto.id, dateYyyyMmDd, currency);
      if (row) {
        result[currency] = new Price(crypto, currency, row.price);
      } else {
        missing.push(currency);
      }
    }
    if (missing.length == 0) {
      return result;
    }
    // else
    const new_values = await this.backend.getPrice(
      registry,
      crypto,
      date,
      missing, // request only missing data!
      fiatConverter
    );
    log.trace("C9999", `caching price for ${crypto} at ${date.toISOString()}`);
    this.backend_calls += 1;
    this.insert(dateYyyyMmDd, new_values);

    return Object.assign(result, new_values);
  }

  cache(path?: string): Oracle {
    throw new Error("Nested caching is not supported");
  }
}
