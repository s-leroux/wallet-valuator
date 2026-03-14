import assert from "assert";
import { asBlockchain } from "../../../src/blockchain.mjs";
import { ChainAddress } from "../../../src/chainaddress.mjs";
import { Ledger } from "../../../src/ledger.mjs";
import { LedgerTabularAdapter } from "../../../src/tabular/adapters/ledgeradapter.mjs";
import { FakeCryptoAsset } from "../../support/cryptoasset.fake.mjs";
import { FakeTransaction } from "../../support/transaction.fake.mjs";

describe("LedgerTabularAdapter", () => {
  const { bitcoin, ethereum } = FakeCryptoAsset;
  const addr1 = ChainAddress("gnosis", "0x123");
  const addr2 = ChainAddress("gnosis", "0x456");

  // prettier-ignore
  const transactions = [
      FakeTransaction("TRADE", asBlockchain("gnosis"), "2021-01-01", bitcoin.amountFromString("100"), addr1, addr2),
      FakeTransaction("TRADE", asBlockchain("gnosis"), "2021-01-02", ethereum.amountFromString("50"), addr2, addr1),
    ];

  it("should expose the seadings for transaction fields", () => {
    const ledger = Ledger.create(transactions);
    const adapter = new LedgerTabularAdapter(ledger);
    assert.deepEqual(adapter.headings(), [
      "timeStamp",
      "type",
      "from",
      "to",
      "amount",
    ]);
  });

  it("should expose the rows for the transactions", () => {
    const ledger = Ledger.create(transactions);
    const adapter = new LedgerTabularAdapter(ledger);
    const rows = Array.from(adapter.rows());

    // prettier-ignore
    assert.deepEqual(rows, [
      [1609459200, "TRADE", addr1, addr2, bitcoin.amountFromString("100")],
      [1609545600, "TRADE", addr2, addr1, ethereum.amountFromString("50")],
    ]);
  });
});
