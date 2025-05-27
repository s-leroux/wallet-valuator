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
  readonly address: string; // XXX This is named that way by compatibility with the Address class

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
  BETH: "ethereum", // XXX Should we change to "binance-eth"?
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
                "RECEIVE",
                timeStamp,
                received,
                nowhere, // XXX Check receiveAddress field!
                this
              )
            );
          }
          break;

        case "SEND":
          {
            const sent = this.amountFromCrypto(swarm, sentCurrency, sentAmount);
            transactions.push(
              new CEXTransaction(
                this.chain,
                "SEND",
                timeStamp,
                sent,
                this,
                nowhere // XXX Check sentAddress field!
              )
            );
          }
          break;

        case "TRADE":
          {
            /* A TRADE represents simultaneous SEND and RECEIVE events */
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
