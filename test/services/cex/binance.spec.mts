import { assert } from "chai";
import {
  Binance,
  BinanceAccount2,
} from "../../../src/services/cex/binance.mjs";
import {
  CryptoMetadata,
  CryptoRegistryNG,
} from "../../../src/cryptoregistry.mjs";
import { prepare } from "../../support/register.helper.mjs";
import { Swarm } from "../../../src/swarm.mjs";
import { EmptyDataSource } from "../../../src/datasource.mjs";
import { OffChainTransactionType } from "../../../src/transaction.mjs";
import { IndexInfo } from "typescript";

describe("Binance", () => {
  it("should have a chain property", () => {
    assert.equal(Binance.chain.id, "binance-cex");
  });

  describe("amountFromCrypto", function () {
    let cryptoRegistry: CryptoRegistryNG;
    beforeEach(() => {
      cryptoRegistry = CryptoRegistryNG.create();
    });

    const register = prepare(this);

    const testcases = [
      ["USDT", "10.54", "10.54 USDT", "usdt"],
      ["MATIC", "10.54", "10.54 MATIC", "matic"],
    ] as const;

    for (const [crypto, amount, expected, cryptoId] of testcases) {
      register(`case ${crypto} ${amount} => ${expected}`, () => {
        const result = Binance.amountFromCrypto(cryptoRegistry, crypto, amount);
        assert.equal(result.toDisplayString({}), expected);
        assert.strictEqual(
          result.crypto,
          cryptoRegistry.findCryptoAsset(cryptoId),
        );
      });
    }
  });
});

describe("BinanceAccount2", () => {
  describe("loadTransaction", function () {
    let cryptoRegistry: CryptoRegistryNG;
    beforeEach(() => {
      cryptoRegistry = CryptoRegistryNG.create();
    });

    const register = prepare(this);

    const date = new Date("2026-04-22");
    const userId = "1234567890";

    // prettier-ignore
    const testcases: readonly [string, OffChainTransactionType | null][] = [
      // fiat
      ["Spot,Buy Crypto With Fiat,USDC,219.25595997,Via CashBalance -  Wallet", "BUY"],
      ["Spot,Buy Crypto With Fiat,EUR,-2792.74,Via CashBalance", null], // Ignore fiat transactions
      ["Spot,Sell Crypto To Fiat,USDC,-2900,Via CashBalance -  Wallet", "SELL"],
      ["Spot,Sell Crypto To Fiat,EUR,2782.74,Via CashBalance", null], // Ignore fiat transactions
      ["Spot,Deposit,EUR,199,", null], // Ignore fiat transactions
      ["Spot,Deposit,USDC,174.05103,", "BUY"],
      ["Spot,Withdraw,BTC,-0.00396,Withdraw fee is included", "SELL"],

      // Spot
      ["Spot,Transaction Spend,USDC,-938.1967066,", "TRADE"],
      ["Spot,Transaction Buy,BTC,0.01006,", "TRADE"],
      ["Spot,Transaction Revenue,USDT,54.915,", "TRADE"],
      ["Spot,Transaction Sold,SOL,-0.17,", "TRADE"],
      ["Spot,Transaction Fee,BNB,-0.00100292,", null],
      ["Spot,Binance Convert,USDT,-0.41200646,", "TRADE"],

      // staking
      ["Spot,BNSOL Staking - Extra Rewards,SIGN,0.17536365,", "RECEIVE"],
      ["Spot,SOL Staking - Purchase,BNSOL,2.80206121,", "TRADE"],

      // earn
      ["Spot,Simple Earn Flexible Interest,POND,0.03865449,Binance Earn", "RECEIVE"],
      ["Spot,Simple Earn Flexible Subscription,USDC,-562.45413215,Binance Earn", "TRADE"],
      ["Spot,Simple Earn Flexible Redemption,USDC,562.95487342,Binance Earn", "TRADE"],
      ["Spot,Simple Earn Locked Subscription,BERA,-9.443,Binance Earn", "TRADE"],
      ["Spot,Simple Earn Locked Rewards,POL,0.10005431,Binance Earn", "RECEIVE"],
      ["Spot,Cashback Voucher,USDT,0.05779396,", "RECEIVE"],

      
      // Airdrop
      ["Spot,HODLer Airdrops Distribution,MIRA,0.20642469,Binance Launchpool", "RECEIVE"],
      ["Spot,Launchpool Airdrop - System Distribution,KITE,2.15753491,Binance Launchpool", "RECEIVE"],
      ["Spot,Launchpool Subscription/Redemption,BNB,0.3,Binance Launchpool", "TRADE"],

      // Funding
      ["Funding,Crypto Box,USDT,0.03,Binance Pay", "RECEIVE"],

      // Margin
      ["Spot,Transfer Between Main Account/Futures and Margin Account,BTC,-0.008,", "TRADE"],
      ["Isolated Margin,Transfer Between Main Account/Futures and Margin Account,BTC,0.008,", "TRADE"],
      ["Isolated Margin,Isolated Margin Loan,BTC,0.0095,", "UNKNOWN"],
      ["Isolated Margin,Isolated Margin Repayment,BTC,-0.00950039,", "UNKNOWN"],

      // Fee Deduction
      ["Spot,BNB Fee Deduction,BNB,-0.00127163,", null],
      ["Isolated Margin,BNB Fee Deduction,BTC,0.00001607,", null],
      ["Spot,Strategy Trading Fee Rebate,SOL,0.00015,", null],

      // Other
      ["Spot,Asset Recovery,MATIC,-730.23188816,", "TRADE"],          // Token Swap A (outflow)
      ["Spot,Token Swap - Distribution,POL,730.23188816,", "TRADE"],  // Token Swap B (inflow)
      ["Spot,Merchant Acquiring,BNB,-0.00196833,Binance Pay", "UNKNOWN"], // What is that?

    ];

    for (const [line, expected] of testcases) {
      const fields = line.split(",") as [
        string,
        string,
        string,
        string,
        string,
      ];
      register(`case "${line}"`, () => {
        const account = BinanceAccount2.create(EmptyDataSource.create());
        const transaction = account.loadTransaction(
          cryptoRegistry,
          date,
          userId,
          ...fields,
        );
        if (expected === null) {
          assert.isUndefined(transaction);
        } else {
          assert.isDefined(transaction);
          assert.strictEqual(transaction.type, expected);
        }
      });
    }
  });

  describe("createFromPath", () => {
    const path = "fixtures/Binance/binance-transactions-2.csv";

    it("should create a BinanceAccount2 from a path", async () => {
      const account = await BinanceAccount2.createFromPath(path);
      assert.strictEqual(account.chain, Binance.chain);
      assert.strictEqual(account.address, "my-binance-account");
    });

    it("should load transactions from a path", async () => {
      const cryptoRegistry = CryptoRegistryNG.create();
      const cryptoMetadata = CryptoMetadata.create();
      const swarm = Swarm.create([], cryptoRegistry, cryptoMetadata, []);
      const account = await BinanceAccount2.createFromPath(path);
      const transactions = await account.loadTransactions(swarm);

      assert.strictEqual(transactions.length, 91); // hard coded; manual count :(

      const checks: readonly [
        idx: number,
        type: OffChainTransactionType,
        amount: string,
      ][] = [
        [0, "BUY", "325.94914962 USDT"],
        [1, "TRADE", "-159.264 USDT"],
        [2, "TRADE", "1.68 SOL"],
        [3, "TRADE", "-159.79089 USDT"],
        [4, "TRADE", "0.069 ETH"],
        [5, "RECEIVE", "0.15952744 USDT"],
        [6, "TRADE", "-4.8726 USDT"],
        [7, "TRADE", "0.018 BNB"],
        [8, "TRADE", "-0.8 SOL"],
        [9, "TRADE", "79.6 USDT"],
      ];

      for (const [idx, type, amount] of checks) {
        const msg = `at index ${idx}, type ${type}, amount ${amount}`;
        assert.include(transactions[idx], { type }, msg);
        assert.equal(transactions[idx].amount.toDisplayString(), amount, msg);
      }
    });
  });
});
