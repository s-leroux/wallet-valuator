import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { Swarm } from "../../../src/swarm.mjs";
import {
  EtherscanProvider,
  EtherscanAPI,
  Etherscan,
} from "../../../src/services/explorers/etherscan.mjs";
import { FakeCryptoResolver } from "../../support/cryptoresolver.fake.mjs";
import {
  CryptoRegistryNG,
  CryptoMetadata,
} from "../../../src/cryptoregistry.mjs";
import { prepare } from "../../support/register.helper.mjs";

// Fixtures
import ClientError from "../../../fixtures/GnosisScan/ClientError.json" with { type: "json" };
import NormalTransactions from "../../../fixtures/GnosisScan/NormalTransactions.json" with { type: "json" };
import NoTransactionFound from "../../../fixtures/GnosisScan/NoTransactionsFound.json" with { type: "json" };
import Proxy from "../../../fixtures/GnosisScan/Proxy.json" with { type: "json" };
import ProxyError from "../../../fixtures/GnosisScan/ProxyError.json" with { type: "json" };
import RateLimit from "../../../fixtures/GnosisScan/RateLimit.json" with { type: "json" };
import TokenTransfer from "../../../fixtures/GnosisScan/TokenTransfer.json" with { type: "json" };

import { Payload } from "../../../src/provider.mjs";

const MOCHA_TEST_TIMEOUT = 60000;
const API_KEY = process.env["ETHERSCAN_API_KEY"];
const CHAINID = "100"; // gnosis

describe("EtherscanProvider", function () {
  describe("Identify Etherscan errors and OK reponse", function () {
    const register = prepare(this);
    const RETRY = [true, true] as const;
    const ABORT = [true, false] as const;
    const OK = [false, undefined] as const;
    // prettier-ignore
    const testCases: [response: Payload, desc: string, error: boolean, retry?: boolean ][] = [
      [TokenTransfer, "Successful token transfer query", ...OK],
      [NoTransactionFound, "No transaction found", ...OK],
      [Proxy, "Successful query to the Ethereum JSON-RPC proxy", ...OK],
      [ProxyError, "Unsuccessful query to the Ethereum JSON-RPC proxy", ...ABORT],
      [RateLimit, "Rate limiting response", ...RETRY],
      [ClientError, "Invalid request", ...ABORT],
    ] as const;

    for (const [payload, desc, error, retry] of testCases) {
      register(desc, () => {
        assert.deepEqual(EtherscanProvider.__isError(payload), error);
        if (retry !== undefined)
          assert.deepEqual(EtherscanProvider.__shouldRetry(payload), retry);
      });
    }
  });
});

describe("Etherscan", function () {
  if (!API_KEY) {
    throw Error("You must define the ETHERSCAN_API_KEY environment variable");
  }

  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT);

  const cryptoResolver = FakeCryptoResolver.create();
  let provider: EtherscanProvider;
  let gs: EtherscanAPI | undefined;

  beforeEach(function () {
    provider = new EtherscanProvider(API_KEY);
    gs = new EtherscanAPI(provider);
  });

  describe("EtherscanProvider (live)", () => {
    it("should retry query if we hit the rate limit", async function () {
      this.timeout(0);
      assert.equal(provider.retries, 0);
      await Promise.all([
        gs!.blockNoByTime(CHAINID, 1578638524),
        gs!.blockNoByTime(CHAINID, 1578638524),
        gs!.blockNoByTime(CHAINID, 1578638524),
        gs!.blockNoByTime(CHAINID, 1578638524),
        gs!.blockNoByTime(CHAINID, 1578638524),
        gs!.blockNoByTime(CHAINID, 1578638524),
        gs!.blockNoByTime(CHAINID, 1578638524),
      ]);
      assert.isAbove(provider.retries, 0);
    });
  });

  describe("EtherscanAPI", () => {
    describe("blockNoByTime()", () => {
      it("should retrieve block by timestamp", async () => {
        const res = await gs!.blockNoByTime(CHAINID, 1578638524);

        assert.deepEqual(res, {
          status: "1",
          message: "OK",
          result: "7781276", // Was "9251481" before migration to the Etherscan v2 multi-chain API ?!?,
        });
      });
      it("should retrieve block by timestamp", async () => {
        const transaction = NormalTransactions.result[0];
        const res = await gs!.blockNoByTime(CHAINID, +transaction.timeStamp);

        assert.deepEqual(res, {
          status: "1",
          message: "OK",
          result: transaction.blockNumber,
        });
      });
      it("should fail if there is not block at the given timestamp", async () => {
        return assert.isRejected(gs!.blockNoByTime(CHAINID, 1));
      });
    });
    describe("normalTransaction()", () => {
      it("should return a NormalTransaction given its hash", async () => {
        const transaction = NormalTransactions.result[0];
        const res = await gs!.normalTransaction(CHAINID, transaction.hash);

        assert.include(res, {
          status: "1",
          message: "OK",
        });

        assert.include(res.result, {
          hash: transaction.hash,
          blockNumber: `0x${(+transaction.blockNumber).toString(16)}`,
          blockHash: transaction.blockHash,
          from: transaction.from,
          to: transaction.to,
          value: `0x${(+transaction.value).toString(16)}`,
          transactionIndex: `0x${(+transaction.transactionIndex).toString(16)}`,
        });
      });
      it("should fail if the transaction is not found", async () => {
        const txhash =
          "0x000000000000000000000000000000000000000000000000000000000000000";
        return assert.isRejected(gs!.normalTransaction(CHAINID, txhash));
      });
    });
  });

  describe("Etherscan", () => {
    let explorer: Etherscan;
    let cryptoRegistry: CryptoRegistryNG;
    let cryptoMetadata: CryptoMetadata;
    let sw: Swarm;

    beforeEach(() => {
      cryptoRegistry = CryptoRegistryNG.create();
      cryptoMetadata = CryptoMetadata.create();
      explorer = new Etherscan(cryptoRegistry, gs!, CHAINID);
      sw = Swarm.create(
        [explorer],
        cryptoRegistry,
        cryptoMetadata,
        cryptoResolver,
      );
    });

    it("should use the chain given in constructor", () => {
      assert.equal(explorer.chain.name, "100");
    });
    describe("normalTransaction()", () => {
      it("should load a transaction by its hash", async () => {
        const transaction = NormalTransactions.result[0];
        const result = await explorer.getNormalTransactionByHash(
          sw,
          transaction.hash,
        );

        assert.include(result, {
          isError: false,
          hash: transaction.hash,
          blockNumber: +transaction.blockNumber,
        });
      });
    });
  });
  describe("Utilities", () => {});
});
