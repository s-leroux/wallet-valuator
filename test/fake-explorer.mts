import { Explorer } from "../src/services/explorer.mjs";
import { Currency } from "../src/currency.mjs";

const FAKE_CHAIN = "fake-chain";
export class FakeExplorer extends Explorer {
  constructor(chain: string = FAKE_CHAIN) {
    super(chain, new Currency("Chain Native Currency", "CNC", 18));
  }
}
