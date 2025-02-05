import { Explorer } from "../src/services/explorer.mjs";
import { CryptoAsset } from "../src/cryptoasset.mjs";
import { asBlockchain, Blockchain } from "../src/blockchain.mjs";

const FAKE_CHAIN = "fake-chain";
export class FakeExplorer extends Explorer {
  constructor(chain?: Blockchain | string) {
    super(
      asBlockchain(chain ?? FAKE_CHAIN),
      new CryptoAsset("cnc", "Chain Native Currency", "CNC", 18)
    );
  }
}
