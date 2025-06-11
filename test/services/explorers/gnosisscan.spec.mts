import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { Swarm } from "../../../src/swarm.mjs";
import {
  GnosisScanProvider,
  GnosisScanAPI,
  GnosisScan,
} from "../../../src/services/explorers/gnosisscan.mjs";
import { FakeCryptoResolver } from "../../support/cryptoresolver.fake.mjs";
import { CryptoRegistryNG, CryptoMetadata } from "../../../src/cryptoregistry.mjs";
import { prepare } from "../../support/register.helper.mjs";

import RateLimit from "../../../fixtures/GnosisScan/RateLimit.json" with { type: "json" };
import ClientError from "../../../fixtures/GnosisScan/ClientError.json" with { type: "json" };
import NoTransactionFound from "../../../fixtures/GnosisScan/NoTransactionsFound.json" with { type: "json" };
import TokenTransfer from "../../../fixtures/GnosisScan/TokenTransfer.json" with { type: "json" };
import Proxy from "../../../fixtures/GnosisScan/Proxy.json" with { type: "json" };
import ProxyError from "../../../fixtures/GnosisScan/ProxyError.json" with { type: "json" };

const MOCHA_TEST_TIMEOUT = 60000;
const API_KEY = process.env["GNOSISSCAN_API_KEY"];

describe("GnosisScanProvider", function () {
  describe("Identify GnosisScan errors and OK reponse", function () {
    const register = prepare(this);
    const RETRY = [true, true] as const;
    const ABORT = [true, false] as const;
    const OK = [false, undefined] as const;
    // prettier-ignore
    const testCases: [response: object, desc: string, error: boolean, retry?: boolean ][] = [
      [TokenTransfer, "Successful token transfer query", ...OK],
      [NoTransactionFound, "No transaction found", ...OK],
      [Proxy, "Successful query to the Ethereum JSON-RPC proxy", ...OK],
      [ProxyError, "Unsuccessful query to the Ethereum JSON-RPC proxy", ...ABORT],
      [RateLimit, "Rate limiting response", ...RETRY],
      [ClientError, "Invalid request", ...ABORT],
    ];

    for (const [payload, desc, error, retry] of testCases) {
      register(desc, () => {
        assert.deepEqual(GnosisScanProvider.__isError(payload), error);
        if (retry !== undefined)
          assert.deepEqual(GnosisScanProvider.__shouldRetry(payload), retry);
      });
    }
  });
});

describe("GnosisScan", function () {
  if (!API_KEY) {
    throw Error("You must define the GNOSISSCAN_API_KEY environment variable");
  }

  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT);

  const cryptoResolver = FakeCryptoResolver.create();
  let provider: GnosisScanProvider;
  let gs: GnosisScanAPI | undefined;

  beforeEach(function () {
    provider = new GnosisScanProvider(API_KEY);
    gs = new GnosisScanAPI(provider);
  });

  describe("GnosisScanProvider (live)", () => {
    it("should retry query if we hit the rate limit", async function () {
      this.timeout(0);
      assert.equal(provider.retries, 0);
      await Promise.all([
        gs!.blockNoByTime(1578638524),
        gs!.blockNoByTime(1578638524),
        gs!.blockNoByTime(1578638524),
        gs!.blockNoByTime(1578638524),
        gs!.blockNoByTime(1578638524),
        gs!.blockNoByTime(1578638524),
        gs!.blockNoByTime(1578638524),
      ]);
      assert.isAbove(provider.retries, 0);
    });
  });

  describe("GnosisScanAPI", () => {
    describe("blockNoByTime()", () => {
      it("should retrieve block by timestamp", async () => {
        const res = await gs!.blockNoByTime(1578638524);

        assert.deepEqual(res, {
          status: "1",
          message: "OK",
          result: "7781276",
        });
      });
      it("should fail if there is not block at the given timestamp", async () => {
        return assert.isRejected(gs!.blockNoByTime(1));
      });
    });
    describe("normalTransaction()", () => {
      it("should return a NormalTransaction given its hash", async () => {
        const txhash =
          "0xb76d2ba3313ebbfca1177846e791d91a3c7f675ba5c0cf8bb7ac2ad67403237c";
        const res = await gs!.normalTransaction(txhash);

        assert.include(res, {
          status: "1",
          message: "OK",
        });
        assert.include(res.result, {
          hash: txhash,
        });
      });
      it("should fail if the transaction is not found", async () => {
        const txhash =
          "0x000000000000000000000000000000000000000000000000000000000000000";
        return assert.isRejected(gs!.normalTransaction(txhash));
      });
    });
  });

  describe("GnosisScan", () => {
    let explorer: GnosisScan;
    let cryptoRegistry: CryptoRegistryNG;
    let cryptoMetadata: CryptoMetadata;
    let sw: Swarm;

    beforeEach(() => {
      cryptoRegistry = CryptoRegistryNG.create();
      cryptoMetadata = CryptoMetadata.create();
      explorer = new GnosisScan(cryptoRegistry, gs!);
      sw = Swarm.create([explorer], cryptoRegistry, cryptoMetadata, cryptoResolver);
    });

    it("should default to the Gnosis chain", () => {
      assert.equal(explorer.chain.name, "gnosis");
    });
    describe("normalTransaction()", () => {
      it("should load a transaction by its hash", async () => {
        const txhash =
          "0xb76d2ba3313ebbfca1177846e791d91a3c7f675ba5c0cf8bb7ac2ad67403237c";
        const transaction = await explorer.getNormalTransactionByHash(
          sw,
          txhash
        );

        assert.include(transaction, {
          hash: txhash.toLowerCase(),
          isError: false,
          blockNumber: 24740464,
        });
      });
    });
  });
  describe("Utilities", () => {});
});
