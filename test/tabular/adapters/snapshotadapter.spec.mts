import assert from "assert";
import {
  FakeMovement,
  snapshotFromMovements,
} from "../../support/snapshot.fake.mjs";
import { SnapshotTabularAdapter } from "../../../src/tabular/adapters/snapshotadapter.mjs";

const INGRESS = [true, false] as const;
const EGRESS = [false, true] as const;

describe("SnapshotTabularAdapter", () => {
  describe("assets()", () => {
    const movements = [
      FakeMovement(...INGRESS, 10, "100", "dai"),
      FakeMovement(...INGRESS, 20, "200", "ethereum"),
      FakeMovement(...EGRESS, 30, "25", "dai"),
      FakeMovement(...INGRESS, 40, "300", "ethereum"),
    ];

    const snapshot = snapshotFromMovements(movements);

    it("should return the columns specs", () => {
      const tabularAdapter = new SnapshotTabularAdapter(snapshot);
      const columns = tabularAdapter.headings();

      assert.deepEqual(
        columns.map((specs) => specs["name"]),
        ["date", "delta"],
      );
    });
  });
});
