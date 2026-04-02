import { Swarm } from "../../swarm.mjs";
import { CommonExplorer } from "../explorer.mjs";
import { NormalTransaction } from "../../transaction.mjs";

import NormalTransactions from "../../../fixtures/GnosisScan/NormalTransactions.json" with { type: "json" };
import InternalTransactions from "../../../fixtures/InternalTransactions.json" with { type: "json" };
import ERC20TokenTransferEvents from "../../../fixtures/ERC20TokenTransferEvents.json" with { type: "json" };
import { asBlockchain, Blockchain } from "../../blockchain.mjs";
import { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import { NormalTransactionRecord } from "../explorer.mjs";

import {
  FAKE_GNO_CHAIN_ID,
  FAKE_GNO_CHAIN_DATA,
} from "../../../test/support/blockchain.fake.mjs";

export class TestScan extends CommonExplorer {
  constructor(registry: CryptoRegistryNG, chain?: Blockchain) {
    Blockchain.create(FAKE_GNO_CHAIN_ID, FAKE_GNO_CHAIN_DATA);
    super(
      chain ?? asBlockchain(FAKE_GNO_CHAIN_ID),
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async accountNormalTransactions(
    address: string,
  ): Promise<NormalTransactionRecord[]> {
    return NormalTransactions.result.filter(
      (record) => record.from === address || record.to === address,
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async accountInternalTransactions(address: string) {
    return InternalTransactions.result.filter(
      (record) => record.from === address || record.to === address,
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async accountTokenTransfers(address: string) {
    return ERC20TokenTransferEvents.result.filter(
      (record) => record.from === address || record.to === address,
    );
  }
}
