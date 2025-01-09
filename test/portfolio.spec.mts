import os from "node:os";

import { assert } from "chai";

import { FakeCryptoAsset } from "./support/cryptoasset.fake.mjs";
import { Amount, CryptoAsset } from "../src/cryptoasset.mjs";
import { BigNumber } from "../src/bignumber.mjs";
import { Portfolio, Snapshot } from "../src/portfolio.mjs";

type M = [boolean, { timeStamp: number; amount: Amount }, Map<string, any>];
const INGRESS = true;
const EGRESS = false;

function mockMovement(
  ingress: boolean,
  timeStamp: number,
  amount: string,
  asset: keyof typeof FakeCryptoAsset,
  ...tags: [string, any][]
): M {
  return [
    ingress,
    {
      timeStamp,
      amount: new Amount(
        FakeCryptoAsset[asset] as CryptoAsset,
        BigNumber.from(amount)
      ),
    },
    new Map(tags),
  ] as const;
}

function snapshotFromMovements(movements: M[]): Snapshot {
  if (!movements.length) {
    throw new Error("Invalid argument: must have at least one movement");
  }

  return movements.reduce<Snapshot | null>(
    (prev, movement) => new Snapshot(...movement, prev),
    null
  )!;
}

function snapshotsFromMovements(movements: M[]): Snapshot[] {
  if (!movements.length) {
    throw new Error("Invalid argument: must have at least one movement");
  }

  let result = [] as Snapshot[];

  movements.reduce<Snapshot | null>((prev, movement) => {
    const s = new Snapshot(...movement, prev);
    result.push(s);
    return s;
  }, null);

  return result;
}

describe("Snapshot", () => {
  describe("constructor", () => {
    it("should correctly initialize an instance", () => {
      const value = "100.5";
      const movement = mockMovement(
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
        `${value} ${FakeCryptoAsset.ethereum}`
      );
    });

    it("should correctly initialize an instance from a parent", () => {
      const movements = [
        mockMovement(INGRESS, 10, "100", "dai"),
        mockMovement(INGRESS, 20, "200", "ethereum"),
        mockMovement(EGRESS, 30, "25", "dai"),
        mockMovement(INGRESS, 40, "300", "ethereum"),
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
      mockMovement(INGRESS, 10, "100", "dai"),
      mockMovement(INGRESS, 20, "200", "ethereum"),
      mockMovement(EGRESS, 30, "25", "dai"),
      mockMovement(INGRESS, 40, "300", "ethereum"),
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
    mockMovement(INGRESS, 5, "50", "solana"),
    mockMovement(INGRESS, 10, "100", "dai"),
    mockMovement(INGRESS, 20, "200", "ethereum"),
    mockMovement(EGRESS, 30, "25", "dai"),
    mockMovement(EGRESS, 35, "50", "solana"),
    mockMovement(INGRESS, 40, "300", "bitcoin"),
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
