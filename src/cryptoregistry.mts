import type { CryptoAsset } from "./cryptoasset.mjs";

export class CryptoRegistry {
  private registry = new WeakMap<CryptoAsset, string>();

  private contructor() {}

  setTag(asset: CryptoAsset, tag: string): void {
    this.registry.set(asset, tag);
  }

  getTag(asset: CryptoAsset): string | undefined {
    return this.registry.get(asset);
  }

  static create(): CryptoRegistry {
    return new CryptoRegistry();
  }
}
