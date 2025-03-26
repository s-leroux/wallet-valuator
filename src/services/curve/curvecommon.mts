export type CurveMetadata = {
  chain: string;
  address: string;
};

export function CurveID(chain: string, address: string) {
  return `curve"${chain}:${address}`.toLowerCase();
}
