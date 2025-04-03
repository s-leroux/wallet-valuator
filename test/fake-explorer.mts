import { Explorer } from "../src/services/explorer.mjs";
import { CryptoRegistry } from "../src/cryptoregistry.mjs";
import { asBlockchain, Blockchain } from "../src/blockchain.mjs";

const FAKE_CHAIN = "fake-chain";
export class FakeExplorer extends Explorer {
  constructor(registry: CryptoRegistry, chain?: Blockchain | string) {
    super(
      asBlockchain(chain ?? FAKE_CHAIN),
      registry.findCryptoAsset("cnc", "Chain Native Currency", "CNC", 18)
    );
  }
}
