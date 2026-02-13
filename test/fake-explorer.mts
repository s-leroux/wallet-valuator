import { Explorer } from "../src/services/explorer.mjs";
import { CryptoRegistryNG } from "../src/cryptoregistry.mjs";
import { asBlockchain, asChainID, Blockchain } from "../src/blockchain.mjs";

const FAKE_CHAIN = "fake-chain";
const FAKE_CHAIN_ID = asChainID(FAKE_CHAIN);
const FAKE_CHAIN_DATA = {
  "display-name": "MyChainName",
  "explorer-id": "MyExplorerId",
};

export class FakeExplorer extends Explorer {
  constructor(registry: CryptoRegistryNG, chain?: Blockchain | string) {
    Blockchain.create(FAKE_CHAIN_ID, FAKE_CHAIN_DATA); // XXX Hack

    super(
      asBlockchain(chain ?? FAKE_CHAIN),
      registry.createCryptoAsset("cnc", "Chain Native Currency", "CNC", 18),
    );
  }
}
