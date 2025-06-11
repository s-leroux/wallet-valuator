import { Explorer } from "../src/services/explorer.mjs";
import { CryptoRegistryNG } from "../src/cryptoregistry.mjs";
import { asBlockchain, Blockchain } from "../src/blockchain.mjs";

const FAKE_CHAIN = "fake-chain";
export class FakeExplorer extends Explorer {
  constructor(registry: CryptoRegistryNG, chain?: Blockchain | string) {
    super(
      asBlockchain(chain ?? FAKE_CHAIN),
      registry.createCryptoAsset("cnc", "Chain Native Currency", "CNC", 18)
    );
  }
}
