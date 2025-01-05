import { Explorer } from "../src/services/explorer.mjs";
import { CryptoAsset } from "../src/cryptoasset.mjs";

const FAKE_CHAIN = "fake-chain";
export class FakeExplorer extends Explorer {
  constructor(chain: string = FAKE_CHAIN) {
    super(chain, new CryptoAsset("cnc", "Chain Native Currency", "CNC", 18));
  }
}
