import assert from "assert";
import {
  FakeMovement,
  portfolioFromMovements,
  snapshotFromMovements,
} from "../../support/snapshot.fake.mjs";
import { SnapshotTabularAdapter } from "../../../src/tabular/adapters/snapshotadapter.mjs";
import { PortfolioTabularAdapter } from "../../../src/tabular/adapters/portfolioadapter.mjs";

const INGRESS = [true, false] as const;
const EGRESS = [false, true] as const;

describe("PortfolioTabularAdapter", () => {
  const movements = [
    FakeMovement(...INGRESS, 10, "100", "dai", ["GRANT", "FUNDINGS"]),
    FakeMovement(...INGRESS, 20, "200", "ethereum"),
    FakeMovement(...EGRESS, 30, "25", "dai"),
    FakeMovement(...INGRESS, 40, "300", "ethereum"),
  ];

  const portfolio = portfolioFromMovements(movements);
  const snapshot = snapshotFromMovements(movements);

  it("should expose the same headings as SnapshotTabularAdapter", () => {
    const portfolioAdapter = new PortfolioTabularAdapter(portfolio);
    const snapshotAdapter = new SnapshotTabularAdapter(snapshot);

    assert.deepEqual(portfolioAdapter.headings(), snapshotAdapter.headings());
  });

  it("should expose the same rows as SnapshotTabularAdapter", () => {
    const portfolioAdapter = new PortfolioTabularAdapter(portfolio);
    const snapshotAdapter = new SnapshotTabularAdapter(snapshot);

    const portfolioRows = Array.from(portfolioAdapter.rows());
    const snapshotRows = Array.from(snapshotAdapter.rows());

    assert.deepEqual(portfolioRows, snapshotRows);
  });
});
