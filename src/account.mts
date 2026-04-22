import { asBlockchain, Blockchain } from "./blockchain.mjs";
import { Swarm } from "./swarm.mjs";
import { Transaction } from "./transaction.mjs";
import { BinanceAccount, BinanceAccount2 } from "./services/cex/binance.mjs";

export interface Account {
  readonly chain: Blockchain;
  readonly address: string; // ISSUE #125 This is named that way by compatibility with the Address class

  loadTransactions(swarm: Swarm): Promise<Transaction[]>;
}

export function MakeAccount(
  swarm: Swarm,
  chain: string | Blockchain,
  id: string,
  data?: object,
): Promise<Account> {
  switch (chain) {
    case "binance-cex":
      return BinanceAccount.createFromPath(id);
    case "binance-cex-2":
      return BinanceAccount2.createFromPath(id);
    default:
      return swarm.address(asBlockchain(chain), id, data);
  }
}
