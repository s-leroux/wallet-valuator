import { CryptoAssetMetadata } from "../../cryptoregistry.mjs";

export interface CurveMetadata extends CryptoAssetMetadata {
  chain: string; // XXX rename to "curve.chain"
  address: string; // idem
  poolAddress?: string; // idem
}
