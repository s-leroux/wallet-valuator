import assert from "assert";

import {
  snapshotsFromMovements,
  FakeMovement,
} from "../../support/snapshot.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import { FakeOracle } from "../../support/oracle.fake.mjs";
import { NullFiatConverter } from "../../../src/services/fiatconverter.mjs";
import {
  CryptoMetadata,
  CryptoRegistryNG,
} from "../../../src/cryptoregistry.mjs";
import { PriceResolver } from "../../../src/priceresolver.mjs";
import { SnapshotValuation } from "../../../src/valuation.mjs";
import { SnapshotValuationTabularAdapter } from "../../../src/tabular/adapters/snapshotvaluationadapter.mjs";

const INGRESS = [true, false] as const;
const EGRESS = [false, true] as const;

describe("SnapshotValuationTabularAdapter", () => {
  const fiatConverter = new NullFiatConverter();

  const movements = [
    // First movement tagged as CASH-IN and DELTA so that tags aggregation is visible.
    FakeMovement(
      ...INGRESS,
      "2024-12-02",
      "200000",
      "usd-coin",
      ["CASH-IN", true],
      ["DELTA", true],
    ),
    FakeMovement(...EGRESS, "2024-12-03", "95833.1362300365", "usd-coin"),
    FakeMovement(...INGRESS, "2024-12-03", "1", "bitcoin"),
  ];

  const snapshots = snapshotsFromMovements(movements);

  async function makeSnapshotValuation(): Promise<SnapshotValuation> {
    const cryptoRegistry = CryptoRegistryNG.create();
    const cryptoMetadata: CryptoMetadata = CryptoMetadata.create();
    const fiatCurrency = FakeFiatCurrency.USD;
    const oracle = new FakeOracle();
    const priceResolver = new PriceResolver(oracle, fiatConverter);

    // Use only the first snapshot for this adapter test.
    const snapshot = snapshots[0];

    return SnapshotValuation.createFromSnapshot(
      cryptoRegistry,
      cryptoMetadata,
      priceResolver,
      fiatCurrency,
      snapshot,
      null,
    );
  }

  describe("headings()", () => {
    it("should return the columns specs", async () => {
      const valuation = await makeSnapshotValuation();
      const adapter = new SnapshotValuationTabularAdapter(valuation);

      const columns = adapter.headings();

      assert.deepEqual(columns, [
        "date",
        "deposits",
        "cashIn",
        "value",
        "tags",
      ]);
    });
  });

  describe("rows()", () => {
    it("should yield a single row with valuation data", async () => {
      const valuation = await makeSnapshotValuation();
      const adapter = new SnapshotValuationTabularAdapter(valuation);

      const rows = Array.from(adapter.rows());

      assert.strictEqual(rows.length, 1);

      const [row] = rows;

      // date
      assert.deepEqual(row[0], valuation.date);

      // deposits, cashIn, and value should match the corresponding Value instances.
      assert.strictEqual(String(row[1]), String(valuation.fiatDeposits));
      assert.strictEqual(String(row[2]), String(valuation.fiscalCash));
      assert.strictEqual(
        String(row[3]),
        String(valuation.cryptoValueAfter.totalCryptoValue),
      );

      // tags are aggregated as a comma-separated list of keys.
      assert.strictEqual(row[4], "CASH-IN, DELTA");
    });
  });
});
