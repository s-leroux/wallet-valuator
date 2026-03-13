//
//  Display a single snapshot valuation using tabular views, based solely on
//  fixture-backed explorer data (TestScan).
//
import { Command } from "commander";

const program = new Command();
program
  .argument("[address]")
  .option("--view <view>", "output view (pretty|csv)", "pretty")
  .option("--separator <sep>", "CSV separator", ",");

program.parse();
const options = program.opts<{
  view: string;
  separator: string;
}>();

const [addressArg] = program.args as string[];

import { Swarm } from "../src/swarm.mjs";
import { Ledger } from "../src/ledger.mjs";
import { Portfolio } from "../src/portfolio.mjs";
import { CryptoRegistryNG } from "../src/cryptoregistry.mjs";
import { CryptoMetadata } from "../src/cryptometadata.mjs";
import { LazyCryptoResolver } from "../src/services/cryptoresolvers/lazycryptoresolver.mjs";
import { TestScan } from "../src/services/explorers/testscan.mjs";
import { SnapshotValuation, PortfolioValuation } from "../src/valuation.mjs";
import { PrettyTabularView } from "../src/tabular/views/prettyview.mjs";
import {
  CSVTabularView,
  type ColumnSpec,
} from "../src/tabular/views/csvview.mjs";
import { SnapshotValuationTabularAdapter } from "../src/tabular/adapters/snapshotvaluationadapter.mjs";
import { NullFiatConverter } from "../src/services/fiatconverter.mjs";
import { FakeFiatCurrency } from "../test/support/fiatcurrency.fake.mjs";
import { FakeOracle } from "../test/support/oracle.fake.mjs";
import { PriceResolver } from "../src/priceresolver.mjs";

const cryptoRegistry = CryptoRegistryNG.create();
const cryptoMetadata = CryptoMetadata.create();
const explorer = new TestScan(cryptoRegistry);
const cryptoResolver = LazyCryptoResolver.create();

const swarm = Swarm.create(
  [explorer],
  cryptoRegistry,
  cryptoMetadata,
  cryptoResolver,
);

// Same default address as other examples using TestScan / GnosisScan.
const DEFAULT_ADDRESS = "0x89344efA2d9953accd3e907EAb27B33542eD9E25";

const address = await swarm.address(
  explorer.chain,
  addressArg ?? DEFAULT_ADDRESS,
);

const ledger = Ledger.create(await address.allValidTransfers(swarm));

ledger.from(address).tag("EGRESS");
ledger.to(address).tag("INGRESS");

const portfolio = Portfolio.createFromLedger(ledger);

// Build snapshot valuations for the portfolio, then take the latest one.
const fiatConverter = new NullFiatConverter();
const oracle = new FakeOracle();
const fiatCurrency = FakeFiatCurrency.EUR;
const priceResolver = new PriceResolver(oracle, fiatConverter); // XXX This is non-functional. We should capture fixture covering the transaction period.

const snapshots = portfolio.snapshots;
let parent: SnapshotValuation | null = null;
const snapshotValuations: SnapshotValuation[] = [];
for (const snapshot of snapshots) {
  // eslint-disable-next-line no-await-in-loop
  parent = await SnapshotValuation.createFromSnapshot(
    cryptoRegistry,
    cryptoMetadata,
    priceResolver,
    fiatCurrency,
    snapshot,
    parent,
  );
  snapshotValuations.push(parent);
}

const portfolioValuation = new PortfolioValuation(snapshotValuations);
const latestValuation = snapshotValuations.at(-1);

if (!latestValuation) {
  // eslint-disable-next-line no-console
  console.error("No snapshots available for valuation.");
  process.exit(1);
}

const adapter = new SnapshotValuationTabularAdapter(latestValuation);

const columnSpecs: readonly ColumnSpec[] = [
  { name: "date", "date.format": "YYYY-MM-DD" },
  { name: "deposits" },
  { name: "cashIn" },
  { name: "value" },
  { name: "tags" },
];

const viewName = options.view ?? "pretty";

if (viewName === "csv") {
  const separator = options.separator ?? ",";
  const view = new CSVTabularView(adapter, separator);
  for (const line of view.lines(columnSpecs)) {
    // eslint-disable-next-line no-console
    console.log("%s", line);
  }
} else {
  const view = new PrettyTabularView(adapter);
  for (const line of view.lines(columnSpecs)) {
    // eslint-disable-next-line no-console
    console.log("%s", line);
  }
}
