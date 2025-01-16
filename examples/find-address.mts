//
//  This example show how to access an address from a chain
//
import { Command } from "commander";
const program = new Command();
program.argument("[<address>]");

program.parse();
const options = program.opts();

import { Swarm } from "../src/swarm.mjs";
import { Ledger } from "../src/ledger.mjs";
import { TestScan } from "../src/services/explorers/testscan.mjs";
import { GnosisScan } from "../src/services/explorers/gnosisscan.mjs";
import { DefaultCryptoResolver } from "../src/services/cryptoresolvers/default.mjs";

const explorer = program.args.length
  ? GnosisScan.create(process.env.GNOSISSCAN_API_KEY ?? "")
  : new TestScan();
const cryptoResolver = new DefaultCryptoResolver();

const swarm = new Swarm([explorer], cryptoResolver);

// A "random" address found on GnosisScan
const address = swarm.address(
  explorer,
  cryptoResolver,
  program.args[0] ?? "0x89344efA2d9953accd3e907EAb27B33542eD9E25"
);

const ledger = Ledger.create(
  await address.allValidTransfers(swarm, cryptoResolver)
).slice(0, 100); // keep only the 100 first transaction as this appears to be a live account
for (const entry of ledger) {
  console.log("%s", entry);
}
