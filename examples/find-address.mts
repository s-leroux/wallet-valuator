//
//  This example show how to access an address from a chain
//
import { Swarm } from "../src/swarm.mjs";
import { GnosisScan } from "../src/services/explorers/gnosisscan.mjs";

const explorer = GnosisScan.create(process.env["GNOSISSCAN_API_KEY"]);
const swarm = new Swarm([explorer]);

const string = process.env["GNOSIS_ACCOUNT"];
if (string) {
  swarm.address("gnosis", process.env["GNOSIS_ACCOUNT"]);
}
console.dir(swarm);
