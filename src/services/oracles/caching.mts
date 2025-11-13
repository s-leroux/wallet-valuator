import type { CryptoAsset } from "../../cryptoasset.mjs";
import type {
  CryptoMetadata,
  CryptoRegistryNG,
} from "../../cryptoregistry.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import { type Oracle, PriceMap } from "../oracle.mjs";

import { logger as logger } from "../../debug.mjs";
const log = logger("caching-oracle");

import Database from "better-sqlite3";
import { AssertionError, ProtocolError } from "../../error.mjs";
import { GlobalPriceMetadata } from "../../price.mjs";

const DB_INIT_SEQUENCE = `
PRAGMA foreign_keys = ON;

--
-- Database-level metadata (version, copyright, ...)
--
CREATE TABLE IF NOT EXISTS db_metadata (
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (key)
);

INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('version', 'v0');
`;

const DB_CREATE_V0 = `
--
-- Cached prices
--
CREATE TABLE IF NOT EXISTS prices (
  oracle_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  date TEXT NOT NULL,
  price REAL NOT NULL,
  PRIMARY KEY (oracle_id, currency, date)
);
`;

// v1 was never used
const DB_UPDATE_TO_V1 = `
INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('version', 'v1');
`;

const DB_UPDATE_TO_V2 = `
--
-- The 'dictionary' table is a simple index of text values
-- It is normaly used to store other entities' metadata in
-- a more compact way.
---
CREATE TABLE IF NOT EXISTS dictionary (
  rowid INTEGER PRIMARY KEY, -- Magic SQlite3 autoincrement usable as a foreign parent key
  value TEXT NOT NULL,
  UNIQUE (value)
);

ALTER TABLE prices ADD COLUMN origin INTEGER REFERENCES dictionary (rowid);
INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('version', 'v2');
`;

const DB_UPDATE_TO_V3 = `
ALTER TABLE prices ADD COLUMN confidence REAL;
UPDATE prices SET confidence = 1 WHERE confidence IS NULL;
INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('version', 'v3');
`;

export const DB_VERSION = "v3";

export class Caching /*extends Oracle*/ {
  // We cannot extend Oracle due to circular dependencies
  readonly backend: Oracle;
  readonly db: Database.Database;

  // for statistics
  backend_calls: number;

  constructor(backend: Oracle, path: string | undefined) {
    path ??= ":memory:";

    this.backend = backend;
    this.backend_calls = 0;
    let existing = path != ":memory:";
    try {
      try {
        this.db = new Database(path, { fileMustExist: true });
      } catch (err) {
        this.db = new Database(path, { fileMustExist: false });
        existing = false;
      }
    } catch (err) {
      log.error(
        "C3005",
        `Cannot open the database ${path}`,
        `(${process.cwd()})`
      );
      throw err;
    }
    this.db.exec(DB_INIT_SEQUENCE);
    if (!existing) {
      log.info("C1003", `Creating the DB v0`);
      this.db.exec(DB_CREATE_V0);
    }
    this.updateDb();
  }

  /**
   * Returns the current version of the database as stored in the db_metadata table.
   * @returns The database version string
   * @throws {ProtocolError} If the database version cannot be identified
   */
  dbVersion(): string {
    const row = this.dbMetadata("version");
    if (row) {
      return row.value;
    } else {
      log.error("C3009");
      log.error("C3009", `Please manually set the database version to "v0"`);
      throw new ProtocolError("Cannot identify the database version");
    }
  }

  dbMetadata(key: string) {
    const stmt = this.db.prepare<[string], { value: string }>(
      "SELECT value FROM db_metadata WHERE key = ?"
    );
    return stmt.get(key);
  }

  /**
   * Returns the index of a string in the dictionary table.
   * If the string is not present, it is stored and its new index is returned.
   */
  dictionary(text: string) {
    // ISSUE #107 Cache those data!
    const select_stmt = this.db.prepare<[string], { rowid: number }>(
      "SELECT rowid FROM dictionary WHERE value = ?"
    );

    const result = select_stmt.get(text);
    if (result) {
      return result.rowid;
    }
    // else

    const insert_stmt = this.db.prepare<[string]>(
      "INSERT OR IGNORE INTO dictionary(value) VALUES (?)"
    );
    const info = insert_stmt.run(text);
    return info.lastInsertRowid;
  }

  dictionaryValue(rowid: number | null | undefined) {
    if (rowid === undefined || rowid === null) {
      return undefined;
    }
    const stmt = this.db.prepare<[number], { value: string }>(
      "SELECT value FROM dictionary WHERE rowid = ?"
    );
    const result = stmt.get(rowid);
    return result?.value;
  }

  updateDbToV1() {
    log.info("C1003", `Updating the DB to v1`);
    this.db.exec(DB_UPDATE_TO_V1);
  }

  updateDbToV2() {
    log.info("C1003", `Updating the DB to v2`);
    this.db.exec(DB_UPDATE_TO_V2);
  }

  updateDbToV3() {
    log.info("C1003", `Updating the DB to v3`);
    this.db.exec(DB_UPDATE_TO_V3);
  }

  updateDb() {
    const dbVersion = this.dbVersion();
    switch (dbVersion) {
      case "v0":
        this.db.transaction(() => {
          this.updateDbToV1();
        })();
      // falls through
      case "v1":
        this.db.transaction(() => {
          this.updateDbToV2();
        })();
      // falls through
      case "v2":
        this.db.transaction(() => {
          this.updateDbToV3();
        })();
      // falls through
      case "v3":
        break;
      default:
        throw new AssertionError(`Unrecognized DB version ${dbVersion}`);
    }
  }

  insertPrice(date: string, prices: PriceMap): void {
    // ISSUE #108 Above ^^ Use a Date parameter
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO prices(oracle_id, date, currency, price, origin, confidence) VALUES (?,?,?,?,?,?)"
    );
    for (const price of prices.values()) {
      log.trace(
        "C1010",
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        `Caching price for ${price.crypto}/${price.fiatCurrency} at ${date}`
      );

      const metadata = GlobalPriceMetadata.getMetadata(price);
      const origin =
        (metadata?.origin && this.dictionary(metadata.origin)) || undefined;
      stmt.run(
        price.crypto.id,
        date,
        price.fiatCurrency.code,
        price.rate.toFixed(),
        origin,
        price.confidence
      );
    }
  }

  async getPrice(
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    crypto: CryptoAsset,
    date: Date,
    currencies: Set<FiatCurrency>,
    result: PriceMap
  ): Promise<void> {
    const dateYyyyMmDd = date.toISOString().substring(0, 10); // XXX replace with formatDate
    const missing: FiatCurrency[] = [];
    const stmt = this.db.prepare<
      [string, string, string],
      { price: number; origin: number | null; confidence: number | null }
    >(
      "SELECT price, origin, confidence FROM prices WHERE oracle_id = ? AND date = ? AND currency = ?"
    );
    for (const currency of currencies) {
      const row = stmt.get(crypto.id, dateYyyyMmDd, currency.code);
      if (row) {
        const confidence = row.confidence ?? 1;
        const price = crypto.price(currency, row.price, confidence);
        const origin = this.dictionaryValue(row.origin);
        if (origin) {
          GlobalPriceMetadata.setMetadata(price, {
            origin,
            confidence,
          });
        } else {
          GlobalPriceMetadata.setMetadata(price, { confidence });
        }
        result.set(currency, price);
      } else {
        log.trace(
          "C1007",
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          `Cache miss for ${crypto}/${currency} as ${dateYyyyMmDd}`
        );
        missing.push(currency);
      }
    }
    if (missing.length == 0) {
      return;
    }
    // else
    await this.backend.getPrice(
      cryptoRegistry,
      cryptoMetadata,
      crypto,
      date,
      new Set(missing), // request only missing data!
      result
    );
    this.backend_calls += 1;
    this.insertPrice(dateYyyyMmDd, result); // ISSUE #158 We should only insert *missing* prices (or maybe more accurate one? See #94)
  }

  cache(path?: string): Oracle {
    throw new Error("Nested caching is not supported");
  }
}
