import assert from "assert";
import {
  FakeMovement,
  snapshotFromMovements,
} from "../support/snapshot.fake.mjs";
import { SnapshotTabularAdapter } from "../../src/tabular/adapters/snapshotadapter.mjs";
import { PrettyTabularView } from "../../src/tabular/views/prettyview.mjs";
import { Text } from "../../src/text.mjs";

const INGRESS = [true, false] as const;
const EGRESS = [false, true] as const;

describe("SnapshotPrettyView", () => {
  describe("assets()", () => {
    const movements = [
      FakeMovement(...INGRESS, "2024-01-01", "100", "dai", [
        "GRANT",
        "FUNDINGS",
      ]),
      FakeMovement(...INGRESS, "2024-02-01", "200", "ethereum"),
      FakeMovement(...EGRESS, "2024-03-01", "25", "dai"),
      FakeMovement(...INGRESS, "2024-04-01", "300", "ethereum"),
    ];

    const snapshot = snapshotFromMovements(movements);

    it("should return the columns specs", () => {
      const tabularAdapter = new SnapshotTabularAdapter(snapshot);
      const prettyView = new PrettyTabularView(tabularAdapter);

      const result = new Text(
        prettyView.lines([
          { name: "date", "date.format": "DD/MM/YYYY" },
          { name: "tags" },
          { name: "delta" },
        ]),
      );
      assert.deepEqual(result.lines(), [
        "01/04/2024|       DELTA|300 ETH",
        "01/03/2024|       DELTA|-25 DAI",
        "01/02/2024|       DELTA|200 ETH",
        "01/01/2024|GRANT, DELTA|100 DAI",
      ]);
    });
  });
});
