import type { Blockchain } from "../../src/blockchain.mjs";
import type { ChainAddress } from "../../src/chainaddress.mjs";
import type { Transaction } from "../../src/transaction.mjs";
import { timeStampFromDate, type DateSource } from "../../src/date.mjs";
import type { Amount } from "../../src/cryptoasset.mjs";

export function FakeTransaction(
  type: string, // default e.g. "TRADE" or "BUY"
  chainName: Blockchain, // default a common chain
  timeStamp: DateSource, // accept unix seconds or "YYYY-MM-DD"
  amount: Amount,
  from: ChainAddress, // optional, default dummy address
  to: ChainAddress, // optional, default dummy address
  comments: string[] = [],
): Transaction {
  return {
    type,
    chainName,
    timeStamp: timeStampFromDate(timeStamp),
    amount,
    from,
    to,
    comments,
  };
}
