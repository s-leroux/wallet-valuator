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
import { CryptoRegistryNG } from "../src/cryptoregistry.mjs";
import { CryptoMetadata } from "../src/cryptometadata.mjs";
import { tabular, toDisplayString } from "../src/displayable.mjs";
import { LazyCryptoResolver } from "../src/services/cryptoresolvers/lazycryptoresolver.mjs";

const cryptoRegistry = CryptoRegistryNG.create();
const cryptoMetadata = CryptoMetadata.create();
const explorer = program.args.length
  ? GnosisScan.create(cryptoRegistry, process.env.GNOSISSCAN_API_KEY ?? "")
  : new TestScan(cryptoRegistry);
const cryptoResolver = LazyCryptoResolver.create();

const swarm = Swarm.create(
  [explorer],
  cryptoRegistry,
  cryptoMetadata,
  cryptoResolver
);

// A "random" address found on GnosisScan
const address = await swarm.address(
  explorer.chain,
  program.args[0] ?? "0x89344efA2d9953accd3e907EAb27B33542eD9E25"
);

const ledger = Ledger.create(await address.allValidTransfers(swarm)).slice(
  0,
  100
); // keep only the 100 first transaction as this appears to be a live account
for (const entry of ledger) {
  console.log(
    "%s",
    toDisplayString(entry, {
      "address.compact": true,
      "record.format": tabular(" : ", "", "10", "", "", ""),
    })
  );
}
