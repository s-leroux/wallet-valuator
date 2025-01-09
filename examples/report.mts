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
const oracle = CoinGecko.create(env("COINGECKO_API_KEY")).cache("cache.db");

const swarm = new Swarm([explorer]);
const address = swarm.address(explorer, program.args[0]);

const ledger = Ledger.create(await address.allValidTransfers(swarm));
ledger.from(address).tag("EGRESS");
ledger.to(address).tag("INGRESS");

const portfolio = Portfolio.createFromLedger(ledger);
console.log("%s", portfolio.asCSV());
