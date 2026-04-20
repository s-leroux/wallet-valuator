import { Swarm } from "../../swarm.mjs";
import { CommonExplorer } from "../explorer.mjs";
import { NormalTransaction } from "../../transaction.mjs";

import NormalTransactions from "../../../fixtures/GnosisScan/NormalTransactions.json" with { type: "json" };
import InternalTransactions from "../../../fixtures/InternalTransactions.json" with { type: "json" };
import ERC20TokenTransferEvents from "../../../fixtures/ERC20TokenTransferEvents.json" with { type: "json" };
import { Blockchain } from "../../blockchain.mjs";
import { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import { NormalTransactionRecord } from "../explorer.mjs";

import {
  FAKE_GNO_CHAIN_ID,
  FAKE_GNO_CHAIN_DATA,
} from "../../../test/support/blockchain.fake.mjs";

/**
 * Fixture-backed explorer for Gnosis-style EVM data: same role as a real block
 * explorer, but reads normal txs, internal txs, and ERC-20 transfers from the
 * checked-in JSON fixtures instead of HTTP APIs.
 *
 * Uses a synthetic chain id ({@link FAKE_GNO_CHAIN_ID}) so tests and examples
 * do not collide with the real `gnosis` chain. Handy for deterministic,
 * offline runs (no keys, no network).
 */
export class TestScan extends CommonExplorer {
  constructor(registry: CryptoRegistryNG, chain?: Blockchain) {
    if (chain === undefined) {
      chain = Blockchain.create(FAKE_GNO_CHAIN_ID, FAKE_GNO_CHAIN_DATA);
    }
    super(chain, registry.createCryptoAsset("xdai", "xDai", "xDai", 18));
  }

  register(swarm: Swarm): void {
    // populate with well-known addresses
    super.register(swarm);
    void swarm.address(
      this.chain,
      "0x0000000000000000000000000000000000000000",
      {
        name: "Null",
      },
    );
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
