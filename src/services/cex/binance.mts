import { asBlockchain, Blockchain } from "../../blockchain.mjs";
import { ChainAddress } from "../../chainaddress.mjs";
import { Amount, CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import { DataSource, CSVFile } from "../../csvfile.mjs";
import { WellKnownCryptoAssets } from "../../data/wellknowncryptoassets.mjs";
import { DisplayOptions } from "../../displayable.mjs";
import { ValueError } from "../../error.mjs";
import { Logged } from "../../errorutils.mjs";
import { isFiatCurrencyCode } from "../../fiatcurrency.mjs";
import { Swarm } from "../../swarm.mjs";
import {
  OffChainTransactionType,
  CEXTransaction,
  Transaction,
} from "../../transaction.mjs";
import { Value } from "../../valuation.mjs";

type WellKnownCryptoId = (typeof WellKnownCryptoAssets)[number][0];
const BINANCE_MNEMONIC_TO_CRYPTO_ASSET_ID: Record<
  string,
  WellKnownCryptoId | undefined
> = {
  // @ts-expect-error TypeScript does not handle null-prototype object literals properly
  __proto__: null,

  "2Z": "doublezero",
  ADA: "cardano",
  ALT: "alt",
  APT: "aptos",
  AUDIO: "audius",
  BAL: "balancer",
  BERA: "berachain",
  BETH: "ethereum",
  BNB: "binance-coin",
  BNSOL: "binance-staked-sol",
  BONK: "bonk",
  BTC: "bitcoin",
  CHZ: "chiliz",
  CTSI: "cartesi",
  DOGE: "dogecoin",
  EDEN: "openeden",
  ENA: "ena",
  ETH: "ethereum",
  FLOW: "flow",
  ICP: "internet-computer",
  KITE: "kite",
  KSM: "kusama",
  MANTA: "manta",
  MATIC: "matic",
  MIRA: "mira",
  MORPHO: "morpho",
  ONE: "harmony",
  OXT: "orchid-protocol",
  PIXEL: "pixel",
  POL: "pol",
  POND: "pond",
  QTUM: "qtum",
  RVN: "ravencoin",
  SIGN: "sign",
  SOL: "solana",
  TRX: "tron",
  USDC: "usdc",
  USDT: "usdt",
  WBETH: "wbeth",
  XRP: "ripple",
} as const;

const nowhere = ChainAddress("binance-cex", "nowhere");

export const Binance = {
  chain: asBlockchain("binance-cex"),

  createTransaction(
    type: OffChainTransactionType,
    timeStamp: number,
    amount: Amount,
    from: ChainAddress,
    to: ChainAddress,
    comments: string[] = [],
  ): CEXTransaction {
    return new CEXTransaction(
      Binance.chain,
      type,
      timeStamp,
      amount,
      from,
      to,
      comments,
    );
  },

  amountFromCrypto(
    cryptoRegistry: CryptoRegistryNG,
    binanceMnemonic: string,
    amount: string,
  ): Amount {
    const cryptoAssetId = BINANCE_MNEMONIC_TO_CRYPTO_ASSET_ID[binanceMnemonic];
    if (!cryptoAssetId) {
      throw Logged(
        "C3115",
        ValueError,
        `Unknown crypto-asset "${binanceMnemonic}" for ${Binance.chain}`,
      );
    }

    return cryptoRegistry
      .createCryptoAsset(cryptoAssetId)
      .amountFromString(amount);
  },
};

export class BinanceAccount {
  readonly chain: Blockchain;
  readonly address: string;
  transactions: Transaction[];

  constructor(readonly transactionReport: DataSource<string, string>) {
    this.chain = asBlockchain("binance-cex");
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
      }),
    );
  }

  toDisplayString(options: DisplayOptions): string {
    return `${this.chain}:${this.address}`.toLowerCase();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
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
      const comments = comment ? [comment] : [];
      comments.unshift(`BINANCE TRANSACTION ${id}`);

      switch (type.toUpperCase() as OffChainTransactionType) {
        case "BUY": {
          const received = this.amountFromCrypto(
            swarm,
            receivedCurrency,
            receivedAmount,
          );
          transactions.push(
            this.createTransaction(
              "BUY",
              timeStamp,
              received,
              nowhere,
              this,
              comments,
            ),
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
              comments,
            ),
          );
          break;
        }

        case "RECEIVE": {
          const received = this.amountFromCrypto(
            swarm,
            receivedCurrency,
            receivedAmount,
          );
          transactions.push(
            this.createTransaction(
              "RECEIVE",
              timeStamp,
              received,
              nowhere,
              this,
              comments,
            ),
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
              comments,
            ),
          );
          break;
        }

        case "TRADE": {
          const sent = this.amountFromCrypto(swarm, sentCurrency, sentAmount);
          const received = this.amountFromCrypto(
            swarm,
            receivedCurrency,
            receivedAmount,
          );
          comments.splice(
            1,
            0,
            `PART OF ${sent.crypto} FOR ${received.crypto} TRADE`,
          );
          transactions.push(
            this.createTransaction(
              "TRADE",
              timeStamp,
              received,
              nowhere,
              this,
              comments,
            ),
            this.createTransaction(
              "TRADE",
              timeStamp,
              sent,
              this,
              nowhere,
              comments,
            ),
          );
          break;
        }

        default:
          throw Logged(
            "C3010",
            ValueError,
            `Unknown transaction type "${type}" for ${this.chain}`,
          );
      }
    }

    return transactions;
  }

  private createTransaction(
    type: OffChainTransactionType,
    timeStamp: number,
    amount: Amount,
    from: ChainAddress,
    to: ChainAddress,
    comments: string[] = [],
  ): CEXTransaction {
    return new CEXTransaction(
      this.chain,
      type,
      timeStamp,
      amount,
      from,
      to,
      comments,
    );
  }

  valueFromFiat(swarm: Swarm, fiatCurrency: string, value: string): Value {
    return Value.from(fiatCurrency, value);
  }

  amountFromCrypto(
    swarm: Swarm,
    binanceMnemonic: string,
    amount: string,
  ): Amount {
    return this.resolveCryptoAsset(swarm, binanceMnemonic).amountFromString(
      amount,
    );
  }

  resolveCryptoAsset(swarm: Swarm, binanceMnemonic: string): CryptoAsset {
    const cryptoAssetId = BINANCE_MNEMONIC_TO_CRYPTO_ASSET_ID[binanceMnemonic];
    if (cryptoAssetId)
      return swarm.cryptoRegistry.createCryptoAsset(cryptoAssetId);

    // else
    throw Logged(
      "C3011",
      ValueError,
      `Unknown crypto-asset "${binanceMnemonic}" for ${this.chain}`,
    );
  }
}

const BINANCE_OPERATIONS_2: Record<
  string,
  OffChainTransactionType | null | undefined
> = {
  __proto__: null,

  // Fiat
  "BUY CRYPTO WITH FIAT": "BUY",
  "SELL CRYPTO TO FIAT": "SELL",
  DEPOSIT: "BUY",
  WITHDRAW: "SELL",

  // Spot
  "TRANSACTION BUY": "TRADE",
  "TRANSACTION SPEND": "TRADE",
  "TRANSACTION FEE": null,
  "BINANCE CONVERT": "TRADE",

  // Staking
  "STAKING EXTRA REWARDS": "RECEIVE",
  "STAKING PURCHASE": "TRADE",
  STAKING: "TRADE",

  // Earn
  "SIMPLE EARN FLEXIBLE INTEREST": "RECEIVE",
  "SIMPLE EARN FLEXIBLE": "TRADE",
  "SIMPLE EARN LOCKED REWARDS": "RECEIVE",
  "SIMPLE EARN LOCKED": "TRADE",
  "CASHBACK VOUCHER": "RECEIVE",

  // Funding
  "CRYPTO BOX": "RECEIVE",

  // Airdrop
  "HODLER AIRDROP": "RECEIVE",
  "LAUNCHPOOL AIRDROP": "RECEIVE",
  "LAUNCHPOOL SUBSCRIPTION REDEMPTION": "TRADE",

  // Margin
  "TRANSFER BETWEEN": "TRADE",
  "ISOLATED MARGIN LOAN": "UNKNOWN",
  "ISOLATED MARGIN REPAYMENT": "UNKNOWN",
  "TRANSACTION REVENUE": "TRADE",
  "TRANSACTION SOLD": "TRADE",

  // Fee Deduction
  "FEE DEDUCTION": null,
  "TRADING FEE REBATE": null,

  // Other
  "ASSET RECOVERY": "TRADE",
  "TOKEN SWAP": "TRADE",
  "MERCHANT ACQUIRING": "UNKNOWN",
};

const BINANCE_OPERATIONS_2_RE = new RegExp(
  Object.keys(BINANCE_OPERATIONS_2).join("|"),
  "i",
);

export class BinanceAccount2 {
  get chain() {
    return Binance.chain;
  }
  readonly address: string;

  transactions: Transaction[];

  constructor(readonly transactionReport: DataSource<Date, string>) {
    this.address = "my-binance-account";
  }

  static create(transactionReport: DataSource<Date, string>): BinanceAccount2 {
    return new BinanceAccount2(transactionReport);
  }

  static async createFromPath(path: string) {
    return BinanceAccount2.create(
      await CSVFile.createFromPath(path, (date) => new Date(date), String, {
        reorder(input, heading) {
          // swap the ID and Date columns
          const temp = input[0];
          input[0] = input[1];
          input[1] = temp;
          return input;
        },
      }),
    );
  }

  toDisplayString(options: DisplayOptions = {}): string {
    return `${this.chain}:${this.address}`.toLowerCase();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async loadTransactions(swarm: Swarm): Promise<Transaction[]> {
    let transactions = this.transactions;
    if (transactions) return transactions;
    // else
    this.transactions = transactions = [];
    for (const [time, userId, account, operation, coin, change, remark] of this
      .transactionReport) {
      const tx = this.loadTransaction(
        swarm.cryptoRegistry,
        time,
        userId,
        account,
        operation,
        coin,
        change,
        remark,
      );
      if (tx) {
        transactions.push(tx);
      }
    }

    return transactions;
  }

  loadTransaction(
    cryptoRegistry: CryptoRegistryNG,
    time: Date,
    userId: string,
    account: string,
    operation: string,
    coin: string,
    change: string,
    remark: string,
  ): CEXTransaction | undefined {
    const timeStamp = Math.floor(time.getTime() / 1000);
    const comments = remark ? [remark] : [];
    comments.unshift(`BINANCE TRANSACTION USER ${userId} ACCOUNT ${account}`);

    const match = operation
      .replace(/\W+/g, " ")
      .toUpperCase()
      .match(BINANCE_OPERATIONS_2_RE);
    if (!match) {
      throw Logged(
        "C3113",
        ValueError,
        `Unknown transaction operation "${operation}" for ${this.chain}`,
      );
    }

    const transactionType = BINANCE_OPERATIONS_2[match[0]];
    if (transactionType === null) {
      return undefined;
    }

    if (transactionType === undefined) {
      throw Logged(
        "C3114",
        ValueError,
        `Unknown transaction operation "${operation}" for ${this.chain}`,
      );
    }

    // Special case:
    // Ignore BUY and SELL transactions with fiat currency codes.
    // (we can also notice that BUY with a negative value and SELL with a positive value
    // are the only cases where the coin column is a fiat currency code)
    if (
      (transactionType === "BUY" || transactionType === "SELL") &&
      isFiatCurrencyCode(coin)
    ) {
      return undefined;
    }

    const amount = Binance.amountFromCrypto(cryptoRegistry, coin, change);
    return Binance.createTransaction(
      transactionType,
      timeStamp,
      amount,
      nowhere,
      nowhere,
      comments.concat(`${operation} ${coin} ${change}`),
    );
  }
}
