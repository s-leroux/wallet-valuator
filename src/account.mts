import { asBlockchain } from "./blockchain.mjs";
import { Amount, CryptoAsset } from "./cryptoasset.mjs";
import { CSVFile, DataSource } from "./csvfile.mjs";
import { ValueError } from "./error.mjs";
import { Logged } from "./errorutils.mjs";
import { Swarm } from "./swarm.mjs";
import {
  CEXTransaction,
  OffChainTransactionType,
  Transaction,
} from "./transaction.mjs";
import { Value } from "./valuation.mjs";
import { WellKnownCryptoAssets } from "./wellknowncryptoassets.mjs";

export interface Account {
  readonly chain: string;
  readonly address: string; // XXX This is named that way by compatibility with the Address class

  loadTransactions(swarm: Swarm): Promise<Transaction[]>;
}

type WellKnownCryptoID = (typeof WellKnownCryptoAssets)[number][0];
const BINANCE_MNEMONIC_TO_CRYPTO_ASSET_ID: Record<
  string,
  WellKnownCryptoID | undefined
> = {
  // @ts-expect-error TypeScript does not handle properly null-prototype object literals
  __proto__: null,

  BNB: "binance-coin",
  BTC: "bitcoin",
  ETH: "ethereum",
  POND: "pond",
  SOL: "solana",
  USDT: "usdt",
} as const;

const nowhere = {
  chain: "binance-cex",
  address: "null",
} as const;

class BinanceAccount implements Account {
  readonly chain: string;
  readonly address: string;
  transactions: Transaction[];

  constructor(readonly transactionReport: DataSource<string, string>) {
    this.chain = "binance-cex";
    this.address = "my-binance-account";
  }

  static create(transactionReport: DataSource<string, string>): BinanceAccount {
    return new BinanceAccount(transactionReport);
  }

  static async createFromPath(path: string) {
    return BinanceAccount.create(
      await CSVFile.createFromPath(path, String, String, {
        reorder(input, heading) {
          // swap the ID and Date columns
          const temp = input[0];
          input[0] = input[1];
          input[1] = temp;
          return input;
        },
      })
    );
  }

  async loadTransactions(swarm: Swarm): Promise<Transaction[]> {
    let transactions = this.transactions;
    if (transactions) return transactions;
    // else
    this.transactions = transactions = [];
    for (const [
      date,
      id,
      type,
      label,
      sentAmount,
      sentCurrency,
      sentAddress,
      receivedAmount,
      receivedCurrency,
      feeAmount,
      feeCurrency,
      comment,
    ] of this.transactionReport) {
      console.log(date);
      const timeStamp = Math.floor(new Date(date).getTime() / 1000);

      switch (type.toUpperCase() as OffChainTransactionType) {
        case "BUY":
          {
            //const sent = this.valueFromFiat(swarm, sentCurrency, sentAmount);
            const received = this.amountFromCrypto(
              swarm,
              receivedCurrency,
              receivedAmount
            );
            //const fee = this.valueFromFiat(swarm, feeCurrency, feeAmount);
            transactions.push(
              new CEXTransaction(
                this.chain,
                "BUY",
                timeStamp,
                received,
                nowhere,
                this
              )
            );
          }
          break;

        case "RECEIVE":
          {
            const received = this.amountFromCrypto(
              swarm,
              receivedCurrency,
              receivedAmount
            );
            transactions.push(
              new CEXTransaction(
                this.chain,
                "BUY",
                timeStamp,
                received,
                nowhere,
                this
              )
            );
          }
          break;

        case "TRADE":
          {
            const sent = this.amountFromCrypto(swarm, sentCurrency, sentAmount);
            const received = this.amountFromCrypto(
              swarm,
              receivedCurrency,
              receivedAmount
            );
            //const fee = this.amountFromCrypto(swarm, feeCurrency, feeAmount);
            transactions.push(
              new CEXTransaction(
                this.chain,
                "TRADE",
                timeStamp,
                received,
                nowhere,
                this
              ),
              new CEXTransaction(
                this.chain,
                "TRADE",
                timeStamp,
                sent,
                this,
                nowhere
              )
            );
          }
          break;

        case "SELL":
          {
            const sent = this.amountFromCrypto(swarm, sentCurrency, sentAmount);
            //const received = this.valueFromFiat(swarm, receivedCurrency, receivedAmount)
            //const fee = this.amountFromCrypto(swarm, feeCurrency, feeAmount);
            transactions.push(
              new CEXTransaction(
                this.chain,
                "SELL",
                timeStamp,
                sent,
                this,
                nowhere
              )
            );
          }
          break;

        default:
          throw Logged(
            "C3010",
            ValueError,
            `Unknown transaction type "${type}" for ${this.chain}`
          );
      }
    }

    return transactions;
  }

  valueFromFiat(swarm: Swarm, fiatCurrency: string, value: string): Value {
    return Value.from(fiatCurrency, value);
  }

  amountFromCrypto(
    swarm: Swarm,
    binanceMnemonic: string,
    amount: string
  ): Amount {
    return this.resolveCryptoAsset(swarm, binanceMnemonic).amountFromString(
      amount
    );
  }

  resolveCryptoAsset(swarm: Swarm, binanceMnemonic: string): CryptoAsset {
    const cryptoAssetId = BINANCE_MNEMONIC_TO_CRYPTO_ASSET_ID[binanceMnemonic];
    if (cryptoAssetId) return swarm.registry.createCryptoAsset(cryptoAssetId);

    // else
    throw Logged(
      "C3011",
      ValueError,
      `Unknown crypto-asset "${binanceMnemonic}" for ${this.chain}`
    );
  }
}

export function MakeAccount(
  swarm: Swarm,
  chain: string,
  id: string,
  data?: object
): Promise<Account> {
  switch (chain) {
    case "binance-cex":
      return BinanceAccount.createFromPath(id);
    default:
      return swarm.address(asBlockchain(chain), id, data);
  }
}
