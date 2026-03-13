import assert from "assert";

import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeMovement, snapshotsFromMovements } from "../../support/snapshot.fake.mjs";
import { FakeFiatCurrency } from "../../support/fiatcurrency.fake.mjs";
import { FakeOracle } from "../../support/oracle.fake.mjs";
import {
  PortfolioValuation,
  SnapshotValuation,
} from "../../../src/valuation.mjs";
import { CryptoMetadata, CryptoRegistryNG } from "../../../src/cryptoregistry.mjs";
import { NullFiatConverter } from "../../../src/services/fiatconverter.mjs";
import { PriceResolver } from "../../../src/priceresolver.mjs";
import { SnapshotValuationTabularAdapter } from "../../../src/tabular/adapters/snapshotvaluationadapter.mjs";
import { PortfolioValuationTabularAdapter } from "../../../src/tabular/adapters/portfoliovaluationadapter.mjs";

describe("PortfolioValuationTabularAdapter", () => {
  const fiatConverter = new NullFiatConverter();

  const INGRESS = [true, false] as const;
  const EGRESS = [false, true] as const;

  const movements = [
    FakeMovement(...INGRESS, "2024-12-02", "200000", "usd-coin"),
    FakeMovement(...EGRESS, "2024-12-03", "95833.1362300365", "usd-coin"),
    FakeMovement(...INGRESS, "2024-12-03", "1", "bitcoin"),
  ];

  async function makePortfolioValuation(): Promise<PortfolioValuation> {
    const cryptoRegistry: CryptoRegistryNG = CryptoRegistryNG.create();
    const cryptoMetadata: CryptoMetadata = CryptoMetadata.create();
    const oracle = FakeOracle.create();
    const fiat = FakeFiatCurrency.EUR;

    const snapshots = snapshotsFromMovements(movements);

    return PortfolioValuation.create(
      cryptoRegistry,
      cryptoMetadata,
      oracle,
      fiatConverter,
      fiat,
      snapshots,
    );
  }

  async function makeLastSnapshotValuation(): Promise<SnapshotValuation> {
    const portfolioValuation = await makePortfolioValuation();
    const last = portfolioValuation.snapshotValuations.at(-1);
    if (!last) {
      throw new Error("Expected at least one SnapshotValuation");
    }
    return last;
  }

  describe("headings()", () => {
    it("should expose the same headings as SnapshotValuationTabularAdapter", async () => {
      const portfolioValuation = await makePortfolioValuation();
      const lastSnapshotValuation = await makeLastSnapshotValuation();

      const portfolioAdapter = new PortfolioValuationTabularAdapter(
        portfolioValuation,
      );
      const snapshotAdapter = new SnapshotValuationTabularAdapter(
        lastSnapshotValuation,
      );

      assert.deepEqual(portfolioAdapter.headings(), snapshotAdapter.headings());
    });
  });

  describe("rows()", () => {
    it("should expose the same rows as SnapshotValuationTabularAdapter", async () => {
      const portfolioValuation = await makePortfolioValuation();
      const lastSnapshotValuation = await makeLastSnapshotValuation();

      const portfolioAdapter = new PortfolioValuationTabularAdapter(
        portfolioValuation,
      );
      const snapshotAdapter = new SnapshotValuationTabularAdapter(
        lastSnapshotValuation,
      );

      const portfolioRows = Array.from(portfolioAdapter.rows());
      const snapshotRows = Array.from(snapshotAdapter.rows());

      assert.deepEqual(portfolioRows, snapshotRows);
    });
  });
});

