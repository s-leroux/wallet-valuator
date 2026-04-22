//
//  Display a single snapshot valuation using tabular views, based solely on
//  fixture-backed explorer data (TestScan).
//
import { Command } from "commander";
import { PACKAGE_VERSION } from "../src/version.mjs";

const program = new Command();
program
  .version(PACKAGE_VERSION)
  .argument("[address]")
  .option("--view <view>", "output view (pretty|csv)", "pretty")
  .option("--separator <sep>", "CSV separator", ",");

program.parse();
const options = program.opts<{
  view: string;
  separator: string;
}>();

const [addressArg] = program.args;

import { Swarm } from "../src/swarm.mjs";
import { Ledger } from "../src/ledger.mjs";
import { Portfolio } from "../src/portfolio.mjs";
import { CryptoRegistryNG } from "../src/cryptoregistry.mjs";
import { CryptoMetadata } from "../src/cryptometadata.mjs";
import { TestScan } from "../src/services/explorers/testscan.mjs";
import { SnapshotValuation, PortfolioValuation } from "../src/valuation.mjs";
import { PrettyTabularView } from "../src/tabular/views/prettyview.mjs";
import type { ColumnSpec } from "../src/tabular/view.mjs";
import { CSVTabularView } from "../src/tabular/views/csvview.mjs";
import { SnapshotValuationTabularAdapter } from "../src/tabular/adapters/snapshotvaluationadapter.mjs";
import { NullFiatConverter } from "../src/services/fiatconverter.mjs";
import { FakeFiatCurrency } from "../test/support/fiatcurrency.fake.mjs";
import { PriceResolver } from "../src/priceresolver.mjs";
import { FakeCryptoResolver } from "../test/support/cryptoresolver.fake.mjs";
import { LazyCryptoResolver } from "../src/services/cryptoresolvers/lazycryptoresolver.mjs";
import { OHLCOracle } from "../src/services/oracles/ohlcoracle.mjs";
import { CompositeOracle } from "../src/services/oracles/compositeoracle.mjs";
import { ZeroOracle } from "../src/services/oracles/zerooracle.mjs";
import { objectFormatter } from "../src/displayable.mjs";

const cryptoRegistry = CryptoRegistryNG.create();
const cryptoMetadata = CryptoMetadata.create();
const explorer = new TestScan(cryptoRegistry);
const cryptoResolvers = [
  FakeCryptoResolver.create(),
  LazyCryptoResolver.create(),
];

const swarm = Swarm.create(
  [explorer],
  cryptoRegistry,
  cryptoMetadata,
  cryptoResolvers,
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
const { USD } = FakeFiatCurrency;
const oracles = await Promise.all(
  ["usdc", "xdai"].map(async (asset) => {
    return OHLCOracle.createFromPath(
      cryptoRegistry.findCryptoAsset(asset),
      USD,
      `./fixtures/${asset}-usd-max.csv`,
      {
        dateFormat: "YYYY-MM-DD",
      },
    );
  }),
);
const priceResolver = new PriceResolver(
  CompositeOracle.create([...oracles, ZeroOracle.create()]),
  fiatConverter,
);

const snapshots = portfolio.snapshots;
let parent: SnapshotValuation | null = null;
const snapshotValuations: SnapshotValuation[] = [];
for (const snapshot of snapshots) {
  parent = await SnapshotValuation.createFromSnapshot(
    cryptoRegistry,
    cryptoMetadata,
    priceResolver,
    USD,
    snapshot,
    parent,
  );
  snapshotValuations.push(parent);
}

const portfolioValuation = new PortfolioValuation(snapshotValuations);
const latestValuation = snapshotValuations.at(-1);

if (!latestValuation) {
  console.error("No snapshots available for valuation.");
  process.exit(1);
}

const adapter = new SnapshotValuationTabularAdapter(latestValuation);

const columnSpecs: readonly ColumnSpec[] = [
  { name: "date", "date.format": "YYYY-MM-DD" },
  { name: "deposits" },
  { name: "fiscalCash" },
  {
    name: "valueAfter",
    "amount.format": objectFormatter("{value:14.4} {symbol}"),
  },
  { name: "tags" },
];

const viewName = options.view ?? "pretty";

if (viewName === "csv") {
  const separator = options.separator ?? ",";
  const view = new CSVTabularView(adapter, separator);
  for (const line of view.lines(columnSpecs)) {
    console.log("%s", line);
  }
} else {
  const view = new PrettyTabularView(adapter);
  for (const line of view.lines(columnSpecs)) {
    console.log("%s", line);
  }
}
