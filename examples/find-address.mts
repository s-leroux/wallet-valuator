//
//  This example show how to access an address from a chain
//
import { Swarm } from "../src/swarm.mjs";
import { Ledger } from "../src/ledger.mjs";
import { TestScan } from "../src/services/explorers/testscan.mjs";

const explorer = new TestScan();
const swarm = new Swarm([explorer]);

// A "random" address found on GnosisScan
const address = swarm.address(
  explorer,
  "0x89344efA2d9953accd3e907EAb27B33542eD9E25"
);

const ledger = Ledger.create(await address.allTransfers(swarm)).slice(0, 100); // keep only the 100 first transaction as this appears to be a live account
for (const entry of ledger) {
  console.log("%s", entry);
}
