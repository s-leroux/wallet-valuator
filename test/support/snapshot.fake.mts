// ISSUE #34 This is more an 'helper' file than a 'fake' data file
import type { CryptoAsset, Amount } from "../../src/cryptoasset.mjs";
import { FakeCryptoAsset } from "./cryptoasset.fake.mjs";
import { Snapshot } from "../../src/portfolio.mjs";

type Movement = [
  boolean,
  { timeStamp: number; amount: Amount },
  Map<string, any>
];

function timeStampFromDate(YYYY_MM_DD: string) {
  return Date.parse(YYYY_MM_DD) / 1000;
}

export function FakeMovement( // Capitalized to pretend we are a class. Hin! Hin!
  ingress: boolean,
  timeStampOrDate: number | string,
  amount: string,
  asset: keyof typeof FakeCryptoAsset,
  ...tags: [string, any][]
): Movement {
  return [
    ingress,
    {
      timeStamp:
        typeof timeStampOrDate === "string"
          ? timeStampFromDate(timeStampOrDate)
          : timeStampOrDate,
      amount: FakeCryptoAsset[asset].fromString(amount),
    },
    new Map(tags),
  ] as const;
}

export function snapshotFromMovements(movements: Movement[]): Snapshot {
  if (!movements.length) {
    throw new Error("Invalid argument: must have at least one movement");
  }

  return movements.reduce<Snapshot | null>(
    (prev, movement) => new Snapshot(...movement, prev),
    null
  )!;
}

export function snapshotsFromMovements(movements: Movement[]): Snapshot[] {
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
