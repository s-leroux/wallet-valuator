import { Swarm } from "../../swarm.mjs";
import { CommonExplorer } from "../explorer.mjs";
import { NormalTransaction } from "../../transaction.mjs";

import { Currency } from "../../../src/currency.mjs";
import NormalTransactions from "../../../fixtures/NormalTransactions.json" assert { type: "json" };
import InternalTransactions from "../../../fixtures/InternalTransactions.json" assert { type: "json" };
import ERC20TokenTransferEvents from "../../../fixtures/ERC20TokenTransferEvents.json" assert { type: "json" };

export class TestScan extends CommonExplorer {
  constructor(chain: string = "gnosis-fake") {
    super(chain, new Currency(chain, "", "xDai", "xDai", 18));
  }

  register(swarm: Swarm): void {
    // populate with well-known addresses
    super.register(swarm);
    swarm.address(this, "0x0000000000000000000000000000000000000000", {
      name: "Null",
    });
  }

  async normalTransaction(
    swarm: Swarm,
    txhash: string
  ): Promise<NormalTransaction> {
    for (const transaction of NormalTransactions.result) {
      if (transaction.hash === txhash) {
        return swarm.normalTransaction(this, txhash, transaction);
      }
    }
    throw new Error(`Transaction with hash ${txhash} not found`);
  }

  async accountNormalTransactions(address): Promise<Record<string, any>[]> {
    return NormalTransactions.result;
  }

  async accountInternalTransactions(address): Promise<Record<string, any>[]> {
    return InternalTransactions.result;
  }

  async accountTokenTransfers(address): Promise<Record<string, any>[]> {
    return ERC20TokenTransferEvents.result;
  }
}
