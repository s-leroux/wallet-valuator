//
//  This example show how obtain the balance for an account
//
import { Command } from "commander";
const program = new Command();
program.argument("[<address>]");

program.parse();
const options = program.opts();

import { Swarm } from "../src/swarm.mjs";
import { Ledger } from "../src/ledger.mjs";
import { Portfolio } from "../src/portfolio.mjs";
import { TestScan } from "../src/services/explorers/testscan.mjs";
import { GnosisScan } from "../src/services/explorers/gnosisscan.mjs";

const explorer = program.args.length
  ? GnosisScan.create(process.env.GNOSISSCAN_API_KEY ?? "")
  : new TestScan();
const swarm = new Swarm([explorer]);

// A "random" address found on GnosisScan
const address = swarm.address(
  explorer,
  program.args[0] ?? "0x89344efA2d9953accd3e907EAb27B33542eD9E25"
);

const ledger = Ledger.create(await address.allValidTransfers(swarm));
// keep only the 200 first transaction as this appears to be a live account

ledger.from(address).tag("EGRESS");
ledger.to(address).tag("INGRESS");

const portfolio = new Portfolio(ledger);
const [snapshot] = portfolio.snapshots.slice(-1);
console.log("%s", snapshot);
console.log("%d", ledger.list.length);
