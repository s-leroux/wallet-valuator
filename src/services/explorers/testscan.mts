import { Swarm } from "../../swarm.mjs";
import { CommonExplorer } from "../explorer.mjs";
import { NormalTransaction } from "../../transaction.mjs";

import NormalTransactions from "../../../fixtures/NormalTransactions.json" assert { type: "json" };
import InternalTransactions from "../../../fixtures/InternalTransactions.json" assert { type: "json" };
import ERC20TokenTransferEvents from "../../../fixtures/ERC20TokenTransferEvents.json" assert { type: "json" };
import { asBlockchain, Blockchain } from "../../blockchain.mjs";
import { CryptoRegistry } from "../../cryptoregistry.mjs";

export class TestScan extends CommonExplorer {
  constructor(registry: CryptoRegistry, chain?: Blockchain) {
    super(
      chain ?? asBlockchain("gnosis-fake"),
      registry.createCryptoAsset("xdai", "xDai", "xDai", 18)
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
    txhash: string
  ): Promise<NormalTransaction> {
    for (const transaction of NormalTransactions.result) {
      if (transaction.hash === txhash) {
        return swarm.normalTransaction(this.chain, txhash, transaction);
      }
    }
    throw new Error(`Transaction with hash ${txhash} not found`);
  }

  async accountNormalTransactions(
    address: string
  ): Promise<Record<string, any>[]> {
    return NormalTransactions.result.filter(
      (record) => record.from === address || record.to === address
    );
  }

  async accountInternalTransactions(
    address: string
  ): Promise<Record<string, any>[]> {
    return InternalTransactions.result.filter(
      (record) => record.from === address || record.to === address
    );
  }

  async accountTokenTransfers(address: string): Promise<Record<string, any>[]> {
    return ERC20TokenTransferEvents.result.filter(
      (record) => record.from === address || record.to === address
    );
  }
}
