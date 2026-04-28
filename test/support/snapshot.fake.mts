// ISSUE #34 This is more an 'helper' file than a 'fake' data file
import type { Amount } from "../../src/cryptoasset.mjs";
import { FakeCryptoAsset } from "./cryptoasset.fake.mjs";
import { Portfolio, Snapshot } from "../../src/portfolio.mjs";
import type { Address } from "../../src/address.mjs";
type Movement = [
  ingress: boolean,
  egress: boolean,
  {
    type: string;
    timeStamp: number;
    amount: Amount;
    from?: Address;
    to?: Address;
  },
  tags: Map<string, any>,
  comments: string[],
];

function timeStampFromDate(YYYY_MM_DD: string) {
  // ISSUE #213: Deprecated: use timeStampFromDate from date.mts instead
  return Date.parse(YYYY_MM_DD) / 1000;
}

export function FakeMovement( // Capitalized to pretend we are a class. Hin! Hin!
  ingress: boolean,
  egress: boolean,
  timeStampOrDate: number | string,
  amount: string,
  asset: keyof typeof FakeCryptoAsset,
  ...tags: [string, any][]
): Movement {
  return [
    ingress,
    egress,
    {
      type: "FAKE",
      timeStamp:
        typeof timeStampOrDate === "string"
          ? timeStampFromDate(timeStampOrDate)
          : timeStampOrDate,
      amount: FakeCryptoAsset[asset].amountFromString(amount),
    },
    new Map(tags),
    [],
  ] as const;
}

export function snapshotFromMovements(movements: Movement[]): Snapshot {
  if (!movements.length) {
    throw new Error("Invalid argument: must have at least one movement");
  }

  return movements.reduce<Snapshot | null>(
    (prev, movement) => new Snapshot(...movement, prev),
    null,
  )!;
}

export function snapshotsFromMovements(movements: Movement[]): Snapshot[] {
  if (!movements.length) {
    throw new Error("Invalid argument: must have at least one movement");
  }

  const result = [] as Snapshot[];

  movements.reduce<Snapshot | null>((prev, movement) => {
    const s = new Snapshot(...movement, prev);
    result.push(s);
    return s;
  }, null);

  return result;
}

export function portfolioFromMovements(movements: Movement[]): Portfolio {
  return new Portfolio(snapshotsFromMovements(movements));
}
