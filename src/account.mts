import { asBlockchain } from "./blockchain.mjs";
import { CSVFile, DataSource } from "./csvfile.mjs";
import { Swarm } from "./swarm.mjs";
import { Transaction } from "./transaction.mjs";

export interface Account {
  readonly chain: string;
  readonly address: string; // XXX This is named that way by compatibility with the Address class

  loadTransactions(swarm: Swarm): Promise<Transaction[]>;
}

class BinanceAccount implements Account {
  readonly chain: string;
  readonly address: string;

  constructor(readonly transactionReport: DataSource<string, string>) {
    this.chain = "binance-cex";
    this.address = "my-binance-account";
  }

  async loadTransactions(swarm: Swarm): Promise<Transaction[]> {
    return [];
  }

  static create(transactionReport: DataSource<string, string>): BinanceAccount {
    return new BinanceAccount(transactionReport);
  }
}

export async function MakeAccount(
  swarm: Swarm,
  chain: string,
  id: string,
  data?: object
): Promise<Account> {
  switch (chain) {
    case "binance-cex":
      return BinanceAccount.create(
        await CSVFile.createFromPath(id, String, String)
      );
    default:
      return swarm.address(asBlockchain(chain), id, data);
  }
}
