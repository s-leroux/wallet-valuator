import { asBlockchain } from "./blockchain.mjs";
import { ChainAddressNG } from "./chainaddress.mjs";
import { Amount, CryptoAsset } from "./cryptoasset.mjs";
import { CSVFile, DataSource } from "./csvfile.mjs";
import { DisplayOptions } from "./displayable.mjs";
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
  readonly address: string; // ISSUE #125 This is named that way by compatibility with the Address class

  loadTransactions(swarm: Swarm): Promise<Transaction[]>;
}

type WellKnownCryptoID = (typeof WellKnownCryptoAssets)[number][0];
const BINANCE_MNEMONIC_TO_CRYPTO_ASSET_ID: Record<
  string,
  WellKnownCryptoID | undefined
> = {
  // @ts-expect-error TypeScript does not handle null-prototype object literals properly
  __proto__: null,

  ADA: "cardano",
  APT: "aptos",
  AUDIO: "audius",
  BAL: "balancer",
  BETH: "ethereum",
  BNB: "binance-coin",
  BTC: "bitcoin",
  CHZ: "chiliz",
  CTSI: "cartesi",
  DOGE: "dogecoin",
  ETH: "ethereum",
  FLOW: "flow",
  ICP: "internet-computer",
  KSM: "kusama",
  MATIC: "matic",
  ONE: "harmony",
  OXT: "orchid-protocol",
  POL: "pol",
  POND: "pond",
  QTUM: "qtum",
  RVN: "ravencoin",
  SOL: "solana",
  TRX: "tron",
  USDC: "usdc",
  USDT: "usdt",
  WBETH: "wbeth",
  XRP: "ripple",
} as const;

const nowhere = ChainAddressNG("binance-cex", "nowhere");

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

  toDisplayString(options: DisplayOptions): string {
    return `${this.chain}:${this.address}`.toLowerCase();
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
      const timeStamp = Math.floor(new Date(date).getTime() / 1000);
      const comments = comment && comment !== '""' ? [comment] : [];
      //                          ^^^^^^^^^^^^^^^
      // ISSUE #119 Hack to deal with quotes in csv
      comments.unshift(`BINANCE TRANSACTION ${id}`);

      switch (type.toUpperCase() as OffChainTransactionType) {
        case "BUY": {
          const received = this.amountFromCrypto(
            swarm,
            receivedCurrency,
            receivedAmount
          );
          transactions.push(
            this.createTransaction(
              "BUY",
              timeStamp,
              received,
              nowhere,
              this,
              comments
            )
          );
          break;
        }

        case "SELL": {
          const sent = this.amountFromCrypto(swarm, sentCurrency, sentAmount);
          transactions.push(
            this.createTransaction(
              "SELL",
              timeStamp,
              sent,
              this,
              nowhere,
              comments
            )
          );
          break;
        }

        case "RECEIVE": {
          const received = this.amountFromCrypto(
            swarm,
            receivedCurrency,
            receivedAmount
          );
          transactions.push(
            this.createTransaction(
              "RECEIVE",
              timeStamp,
              received,
              nowhere,
              this,
              comments
            )
          );
          break;
        }

        case "SEND": {
          const sent = this.amountFromCrypto(swarm, sentCurrency, sentAmount);
          transactions.push(
            this.createTransaction(
              "SEND",
              timeStamp,
              sent,
              this,
              nowhere,
              comments
            )
          );
          break;
        }

        case "TRADE": {
          const sent = this.amountFromCrypto(swarm, sentCurrency, sentAmount);
          const received = this.amountFromCrypto(
            swarm,
            receivedCurrency,
            receivedAmount
          );
          comments.splice(
            1,
            0,
            `PART OF ${sent.crypto} FOR ${received.crypto} TRADE`
          );
          transactions.push(
            this.createTransaction(
              "TRADE",
              timeStamp,
              received,
              nowhere,
              this,
              comments
            ),
            this.createTransaction(
              "TRADE",
              timeStamp,
              sent,
              this,
              nowhere,
              comments
            )
          );
          break;
        }

        case "DEPOSIT":
          {
            /* We do not track fiat deposits */
            // do nothing
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

  private createTransaction(
    type: OffChainTransactionType,
    timeStamp: number,
    amount: Amount,
    from: ChainAddressNG,
    to: ChainAddressNG,
    comments: string[] = []
  ): CEXTransaction {
    return new CEXTransaction(
      this.chain,
      type,
      timeStamp,
      amount,
      from,
      to,
      comments
    );
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
