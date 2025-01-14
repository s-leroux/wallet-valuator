//
//  Export an an account assets and value.
//
import { Command } from "commander";
const program = new Command();
program.argument("<address>");

program.parse();
const options = program.opts();

import { Swarm } from "../src/swarm.mjs";
import { Ledger } from "../src/ledger.mjs";
import { Portfolio } from "../src/portfolio.mjs";
import { FiatCurrency } from "../src/fiatcurrency.mjs";
import { TestScan } from "../src/services/explorers/testscan.mjs";
import { GnosisScan } from "../src/services/explorers/gnosisscan.mjs";
import { CoinGecko } from "../src/services/oracles/coingecko.mjs";

function env(name: string): string {
  const result = process.env[name];
  if (!result) {
    throw new Error(`The environment variable ${name} must be defined`);
  }
  return result;
}

const explorer = GnosisScan.create(env("GNOSISSCAN_API_KEY"));
const oracle = CoinGecko.create(env("COINGECKO_API_KEY")).cache(
  "historical-data.db"
);

const swarm = new Swarm([explorer]);
const address = swarm.address(explorer, program.args[0]);

const ledger = Ledger.create(await address.allValidTransfers(swarm));
ledger.from(address).tag("EGRESS");
ledger.to(address).tag("INGRESS");

const portfolio = Portfolio.createFromLedger(ledger);
console.log("%s", portfolio.asCSV()); // XXX ISSUE #23 Actually this shows the portfolio _history_
const valuations = await Promise.all(
  portfolio.snapshots.map(
    (snapshot) => snapshot.evaluate(oracle, FiatCurrency("usd"))
    // XXX ISSUE #22 Check: fiat curencies are compared by _value_, cryptoassets are
    // compared by _identity_. Is this coherent?
  )
);
for (const valuation of valuations) {
  console.log("%s", valuation);
}
