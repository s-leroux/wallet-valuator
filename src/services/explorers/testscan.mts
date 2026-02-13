import { Swarm } from "../../swarm.mjs";
import { CommonExplorer } from "../explorer.mjs";
import { NormalTransaction } from "../../transaction.mjs";

import NormalTransactions from "../../../fixtures/GnosisScan/NormalTransactions.json" with { type: "json" };
import InternalTransactions from "../../../fixtures/InternalTransactions.json" with { type: "json" };
import ERC20TokenTransferEvents from "../../../fixtures/ERC20TokenTransferEvents.json" with { type: "json" };
import { asBlockchain, asChainID, Blockchain } from "../../blockchain.mjs";
import { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import { NormalTransactionRecord } from "../explorer.mjs";

const FAKE_CHAIN_ID = asChainID("gnosis-fake");
const FAKE_CHAIN_DATA = {
  "display-name": "Gnosis Fake",
  "explorer-id": "999",
};

export class TestScan extends CommonExplorer {
  constructor(registry: CryptoRegistryNG, chain?: Blockchain) {
    Blockchain.create(FAKE_CHAIN_ID, FAKE_CHAIN_DATA);
    super(
      chain ?? asBlockchain("gnosis-fake"),
      registry.createCryptoAsset("xdai", "xDai", "xDai", 18),
    );
  }

  register(swarm: Swarm): void {
    // populate with well-known addresses
    super.register(swarm);
    swarm.address(this.chain, "0x0000000000000000000000000000000000000000", {
      name: "Null",
    });
  }

  async getNormalTransactionByHash(
    swarm: Swarm,
    txhash: string,
  ): Promise<NormalTransaction> {
    for (const transaction of NormalTransactions.result) {
      if (transaction.hash === txhash) {
        return swarm.normalTransaction(this.chain, txhash, transaction);
      }
    }
    throw new Error(`Transaction with hash ${txhash} not found`);
  }

  async accountNormalTransactions(
    address: string,
  ): Promise<NormalTransactionRecord[]> {
    return NormalTransactions.result.filter(
      (record) => record.from === address || record.to === address,
    );
  }

  async accountInternalTransactions(address: string) {
    return InternalTransactions.result.filter(
      (record) => record.from === address || record.to === address,
    );
  }

  async accountTokenTransfers(address: string) {
    return ERC20TokenTransferEvents.result.filter(
      (record) => record.from === address || record.to === address,
    );
  }
}
