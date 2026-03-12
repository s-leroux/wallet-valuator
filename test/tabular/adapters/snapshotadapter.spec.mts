import assert from "assert";
import {
  FakeMovement,
  snapshotFromMovements,
} from "../../support/snapshot.fake.mjs";
import { SnapshotTabularAdapter } from "../../../src/tabular/adapters/snapshotadapter.mjs";

const INGRESS = [true, false] as const;
const EGRESS = [false, true] as const;

describe("SnapshotTabularAdapter", () => {
  describe("headings()", () => {
    const movements = [
      FakeMovement(...INGRESS, 10, "100", "dai", ["GRANT", "FUNDINGS"]),
      FakeMovement(...INGRESS, 20, "200", "ethereum"),
      FakeMovement(...EGRESS, 30, "25", "dai"),
      FakeMovement(...INGRESS, 40, "300", "ethereum"),
    ];

    const snapshot = snapshotFromMovements(movements);

    it("should return the columns specs", () => {
      const tabularAdapter = new SnapshotTabularAdapter(snapshot);
      const columns = tabularAdapter.headings();

      assert.deepEqual(columns, ["date", "delta", "tags"]);
    });
  });

  describe("rows()", () => {
    const movements = [
      FakeMovement(...INGRESS, 10, "100", "dai", ["GRANT", "FUNDINGS"]),
      FakeMovement(...INGRESS, 20, "200", "ethereum"),
      FakeMovement(...EGRESS, 30, "25", "dai"),
      FakeMovement(...INGRESS, 40, "300", "ethereum"),
    ];

    const snapshot = snapshotFromMovements(movements);

    it("should yield a row per snapshot in reverse chronological order", () => {
      const tabularAdapter = new SnapshotTabularAdapter(snapshot);

      const rows = Array.from(tabularAdapter.rows());

      assert.strictEqual(rows.length, 4);

      const [row0, row1, row2, row3] = rows;

      // timeStamp is in seconds; Date expects milliseconds.
      assert.deepEqual(row0[0], new Date(40 * 1000));
      assert.deepEqual(row1[0], new Date(30 * 1000));
      assert.deepEqual(row2[0], new Date(20 * 1000));
      assert.deepEqual(row3[0], new Date(10 * 1000));

      assert.strictEqual(row0[2], "DELTA");
      assert.strictEqual(row3[2], "GRANT, DELTA");
    });
  });
});
