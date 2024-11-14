//
//  This example show how to access an address from a chain
//
import { Swarm } from "../src/swarm.mjs";
import { GnosisScan } from "../src/services/explorers/gnosisscan.mjs";

const explorer = GnosisScan.create(process.env["GNOSISSCAN_API_KEY"]);
const swarm = new Swarm([explorer]);

console.dir(swarm);
