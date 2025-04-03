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
import { CryptoRegistry } from "../src/cryptoregistry.mjs";
import { GnosisScan } from "../src/services/explorers/gnosisscan.mjs";
import { CoinGecko } from "../src/services/oracles/coingecko.mjs";
import { ImplicitFiatConverter } from "../src/services/fiatconverters/implicitfiatconverter.mjs";
import { DefaultCryptoResolver } from "../src/services/cryptoresolvers/defaultcryptoresolver.mjs";

function env(name: string): string {
  const result = process.env[name];
  if (!result) {
    throw new Error(`The environment variable ${name} must be defined`);
  }
  return result;
}

const registry = CryptoRegistry.create();
const explorer = GnosisScan.create(registry, env("GNOSISSCAN_API_KEY"));
const oracle = CoinGecko.create(env("COINGECKO_API_KEY")).cache(
  "historical-data.db"
);
const cryptoResolver = DefaultCryptoResolver.create();
const fiatConverter = new ImplicitFiatConverter(
  oracle,
  cryptoResolver.getCryptoAsset(registry, "bitcoin")
);

const swarm = Swarm.create([explorer], registry, cryptoResolver);
const address = await swarm.address(explorer.chain, program.args[0]);
const ledger = Ledger.create(await address.allValidTransfers(swarm));
ledger.from(address).tag("EGRESS");
ledger.to(address).tag("INGRESS");

const portfolio = Portfolio.createFromLedger(ledger);
console.log("%s", portfolio.asCSV()); // ISSUE #23 Actually this shows the portfolio _history_
const valuations = await portfolio.evaluate(
  registry,
  oracle,
  fiatConverter,
  FiatCurrency("usd")
);
for (const valuation of valuations.snapshotValuations) {
  console.log("%s", valuation);
}
