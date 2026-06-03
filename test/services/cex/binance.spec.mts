import { assert } from "chai";
import {
  Binance,
  BinanceAccount,
  BinanceAccount2,
} from "../../../src/services/cex/binance.mjs";
import {
  CryptoMetadata,
  CryptoRegistryNG,
} from "../../../src/cryptoregistry.mjs";
import { prepare } from "../../support/register.helper.mjs";
import { Swarm } from "../../../src/swarm.mjs";
import { CSVFile, EmptyDataSource } from "../../../src/datasource.mjs";
import { ChainAddress, mangleChainAddress } from "../../../src/chainaddress.mjs";
import { ValueError } from "../../../src/error.mjs";
import {
  OffChainTransactionType,
  Transaction,
} from "../../../src/transaction.mjs";

const BINANCE_NOWHERE = "binance-cex:nowhere";
const BINANCE_ACCOUNT = "binance-cex:my-binance-account";

const inlineIntegrationBuyStamp = Math.floor(
  new Date("2023-12-22 18:26:26").getTime() / 1000,
);
const inlineIntegrationTradeStamp = Math.floor(
  new Date("2023-12-22 18:34:46").getTime() / 1000,
);
const inlineIntegrationReceiveStamp = Math.floor(
  new Date("2023-12-22 18:41:50").getTime() / 1000,
);

type IntegrationTxTuple = readonly [
  timeStamp: number,
  type: OffChainTransactionType,
  from: string,
  to: string,
  amount: string,
];

/** Canonical outcome for the inline v1/v2 integration scenarios (same economic events). */
const inlineIntegrationExpected: IntegrationTxTuple[] = [
  [
    inlineIntegrationBuyStamp,
    "BUY",
    BINANCE_NOWHERE,
    BINANCE_ACCOUNT,
    "325.94914962 USDT",
  ],
  [
    inlineIntegrationTradeStamp,
    "TRADE",
    BINANCE_NOWHERE,
    BINANCE_ACCOUNT,
    "1.68 SOL",
  ],
  [
    inlineIntegrationTradeStamp,
    "TRADE",
    BINANCE_ACCOUNT,
    BINANCE_NOWHERE,
    "159.264 USDT",
  ],
  [
    inlineIntegrationReceiveStamp,
    "RECEIVE",
    BINANCE_NOWHERE,
    BINANCE_ACCOUNT,
    "0.15952744 USDT",
  ],
];

function integrationTxTuples(
  transactions: Transaction[],
): IntegrationTxTuple[] {
  return transactions.map((tx) => [
    tx.timeStamp,
    tx.type as OffChainTransactionType,
    mangleChainAddress(tx.from),
    mangleChainAddress(tx.to),
    tx.amount.toString(),
  ]);
}

describe("Binance", () => {
  it("should have a chain property", () => {
    assert.equal(Binance.chain.id, "binance-cex");
  });

  it("should reject negative amounts in createTransaction", () => {
    const cryptoRegistry = CryptoRegistryNG.create();
    const amount = Binance.amountFromCrypto(cryptoRegistry, "USDT", "-1");
    try {
      Binance.createTransaction(
        "TRADE",
        0,
        amount,
        ChainAddress("binance-cex", "nowhere"),
        ChainAddress("binance-cex", "my-binance-account"),
      );
      assert.fail("expected createTransaction to throw");
    } catch (err) {
      assert.instanceOf(err, ValueError);
      assert.propertyVal(err, "errCode", "C3117");
    }
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

  describe("integration", () => {
    it("should load transactions from an inline v1 report", async () => {
      // Same economic events as the Binance2 inline integration test, expressed
      // in the legacy v1 column layout (see binance-transactions-2023.csv).
      // prettier-ignore
      const inlineReport = [
        "ID,Date,Type,Label,Sent Amount,Sent Currency,Sent Address,Received Amount,Received Currency,Fee Amount,Fee Currency,Comment",
        "tx-buy,2023-12-22 18:26:26,Buy,N/A,299,EUR,,325.94914962,USDT,1,EUR,",
        "tx-trade,2023-12-22 18:34:46,Trade,N/A,159.264,USDT,,1.68,SOL,0.00168,SOL,",
        "tx-rcv,2023-12-22 18:41:50,Receive,N/A,0,,,0.15952744,USDT,0,,",
      ].join("\n");

      const dataSource = CSVFile.createFromText(inlineReport, String, String, {
        reorder(input) {
          const temp = input[0];
          input[0] = input[1];
          input[1] = temp;
          return input;
        },
      });

      const cryptoRegistry = CryptoRegistryNG.create();
      const cryptoMetadata = CryptoMetadata.create();
      const swarm = Swarm.create([], cryptoRegistry, cryptoMetadata, []);
      const account = BinanceAccount.create(dataSource);
      const transactions = await account.loadTransactions(swarm);

      assert.deepEqual(
        integrationTxTuples(transactions),
        inlineIntegrationExpected,
      );
    });
  });
});

describe("Binance2", () => {
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
      ["Spot,Transaction Buy,BERA,7.572,", "TRADE"],

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

  describe("integration", () => {
    it("should load transactions from an inline v2 report", async () => {
      // prettier-ignore
      const inlineReport = [
        "User ID,Time,Account,Operation,Coin,Change,Remark",
        "user-1,23-12-22 18:26:26,Spot,Buy Crypto With Fiat,USDT,325.94914962,RefWallet",
        "user-1,23-12-22 18:34:46,Spot,Transaction Buy,SOL,1.68,",
        "user-1,23-12-22 18:34:46,Spot,Transaction Spend,USDT,-159.264,",
        "user-1,23-12-22 18:34:46,Spot,Transaction Fee,SOL,-0.00168,",
        "user-1,23-12-22 18:41:50,Spot,Cashback Voucher,USDT,0.15952744,",
      ].join("\n");

      function dateParser(date: string) {
        return new Date("20" + date);
      }

      const dataSource = CSVFile.createFromText(
        inlineReport,
        dateParser,
        String,
        {
          reorder(input) {
            const temp = input[0];
            input[0] = input[1];
            input[1] = temp;
            return input;
          },
        },
      );

      const cryptoRegistry = CryptoRegistryNG.create();
      const cryptoMetadata = CryptoMetadata.create();
      const swarm = Swarm.create([], cryptoRegistry, cryptoMetadata, []);
      const account = BinanceAccount2.create(dataSource);
      const transactions = await account.loadTransactions(swarm);

      assert.deepEqual(
        integrationTxTuples(transactions),
        inlineIntegrationExpected,
      );
    });
  });

  describe("createFromPath", () => {
    const path = "fixtures/Binance/binance-report-v2-sample.csv";

    it("should create a BinanceAccount2 from a path", async () => {
      const account = await BinanceAccount2.createFromPath(path);
      assert.strictEqual(account.chain, Binance.chain);
      assert.strictEqual(account.address, "my-binance-account");
    });

    it("should parse the date properly", async () => {
      const cryptoRegistry = CryptoRegistryNG.create();
      const cryptoMetadata = CryptoMetadata.create();
      const swarm = Swarm.create([], cryptoRegistry, cryptoMetadata, []);
      const account = await BinanceAccount2.createFromPath(path);
      const transactions = await account.loadTransactions(swarm);
      assert.strictEqual(transactions[0].timeStamp, inlineIntegrationBuyStamp);
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
        [1, "TRADE", "159.264 USDT"],
        [2, "TRADE", "1.68 SOL"],
        [3, "TRADE", "159.79089 USDT"],
        [4, "TRADE", "0.069 ETH"],
        [5, "RECEIVE", "0.15952744 USDT"],
        [6, "TRADE", "4.8726 USDT"],
        [7, "TRADE", "0.018 BNB"],
        [8, "TRADE", "0.8 SOL"],
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
