import os from "node:os";

import { assert } from "chai";

import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import {
  FakeMovement,
  snapshotFromMovements,
  snapshotsFromMovements,
} from "./support/snapshot.fake.mjs";
import { Amount, CryptoAsset } from "../src/cryptoasset.mjs";
import { BigNumber } from "../src/bignumber.mjs";
import { Portfolio, Snapshot } from "../src/portfolio.mjs";

const INGRESS = true;
const EGRESS = false;

describe("Snapshot", () => {
  describe("constructor", () => {
    it("should correctly initialize an instance", () => {
      const value = "100.5";
      const movement = FakeMovement(
        true,
        10,
        value,
        "ethereum",
        ["A", true],
        ["B", false]
      );
      const snapshot = new Snapshot(...movement);
      assert.equal(snapshot.holdings.size, 1);
      assert.equal(
        snapshot.holdings.get(FakeCryptoAsset.ethereum)!.toString(),
        `${value} ${FakeCryptoAsset.ethereum.symbol}`
      );
    });

    it("should correctly initialize an instance from a parent", () => {
      const movements = [
        FakeMovement(INGRESS, 10, "100", "dai"),
        FakeMovement(INGRESS, 20, "200", "ethereum"),
        FakeMovement(EGRESS, 30, "25", "dai"),
        FakeMovement(INGRESS, 40, "300", "ethereum"),
      ];

      let snapshot = snapshotFromMovements(movements);

      assert.isNotNull(snapshot);
      assert.equal(snapshot.holdings.size, 2);
      assert.equal(
        snapshot.holdings.get(FakeCryptoAsset.ethereum)!.toString(),
        "500 ETH"
      );
      assert.equal(
        snapshot.holdings.get(FakeCryptoAsset.dai)!.toString(),
        "75 DAI"
      );
    });
  });

  describe("assets()", () => {
    const movements = [
      FakeMovement(INGRESS, 10, "100", "dai"),
      FakeMovement(INGRESS, 20, "200", "ethereum"),
      FakeMovement(EGRESS, 30, "25", "dai"),
      FakeMovement(INGRESS, 40, "300", "ethereum"),
    ];

    let snapshot = snapshotFromMovements(movements);

    it("should return the assets in the snapshot", () => {
      assert.deepEqual(snapshot.assets(), [
        FakeCryptoAsset.dai,
        FakeCryptoAsset.ethereum,
      ]);
    });
  });
});

describe("Portfolio", () => {
  describe("constructor", () => {
    // TBD
  });

  const movements = [
    FakeMovement(INGRESS, 5, "50", "solana"),
    FakeMovement(INGRESS, 10, "100", "dai"),
    FakeMovement(INGRESS, 20, "200", "ethereum"),
    FakeMovement(EGRESS, 30, "25", "dai"),
    FakeMovement(EGRESS, 35, "50", "solana"),
    FakeMovement(INGRESS, 40, "300", "bitcoin"),
  ];

  let portfolio = new Portfolio(snapshotsFromMovements(movements));

  describe("allAssetsEverOwned()", () => {
    it("should return the list of all assets ever owned", () => {
      assert.deepEqual(portfolio.allAssetsEverOwned(), [
        FakeCryptoAsset.solana,
        FakeCryptoAsset.dai,
        FakeCryptoAsset.ethereum,
        FakeCryptoAsset.bitcoin,
      ]);
    });
  });

  describe("asCSV()", () => {
    it("should list of all assets ever owned in the header", () => {
      const csv = portfolio.asCSV();

      const lines = csv.split(os.EOL); // this will implicitly check if we use the OS-specific EOL
      assert.equal(lines.length, 1 + movements.length + 1); // header, content, trailing EOL

      assert.equal(lines[0], "DATE,SOL,DAI,ETH,BTC");
      assert.equal(lines[1], "5,50,0,0,0");
      assert.equal(lines[2], "10,50,100,0,0");
      assert.equal(lines[3], "20,50,100,200,0");
      assert.equal(lines[4], "30,50,75,200,0");
      assert.equal(lines[5], "35,0,75,200,0");
      assert.equal(lines[6], "40,0,75,200,300");
      assert.equal(lines[7], "");
    });
  });
});
