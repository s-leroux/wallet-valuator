import { Explorer } from "../../src/services/explorer.mjs";
import { CryptoRegistryNG } from "../../src/cryptoregistry.mjs";
import { asBlockchain, Blockchain } from "../../src/blockchain.mjs";
import { FAKE_GNO_CHAIN_ID, FAKE_GNO_CHAIN_DATA } from "./blockchain.fake.mjs";

export class FakeExplorer extends Explorer {
  constructor(registry: CryptoRegistryNG, chain?: Blockchain | string) {
    Blockchain.create(FAKE_GNO_CHAIN_ID, FAKE_GNO_CHAIN_DATA); // XXX Hack

    super(
      asBlockchain(chain ?? FAKE_GNO_CHAIN_ID),
      registry.createCryptoAsset("xdai", "xDai", "xDai", 18),
    );
  }
}
