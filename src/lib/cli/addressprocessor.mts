import { readFile } from "node:fs/promises";

import { Swarm } from "../../../src/swarm.mjs";
import { Ledger } from "../../../src/ledger.mjs";
import { GnosisScan } from "../../../src/services/explorers/gnosisscan.mjs";
import { CompositeCryptoResolver } from "../../../src/services/cryptoresolvers/compositecryptoresolver.mjs";
import { CryptoRegistryNG } from "../../../src/cryptoregistry.mjs";
import { asBlockchain } from "../../blockchain.mjs";
import { DisplayOptions, format } from "../../displayable.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import { CompositeOracle } from "../../services/oracles/compositeoracle.mjs";
import {
  CoinGeckoOracle,
  InternalToCoinGeckoIdMapping,
} from "../../services/oracles/coingecko.mjs";
import { IgnoreCryptoResolver } from "../../services/cryptoresolvers/ignorecryptoresolver.mjs";
import { DefaultCryptoResolver } from "../../services/cryptoresolvers/defaultcryptoresolver.mjs";
import { CurveResolver } from "../../services/curve/curveresolver.mjs";
import { CurveOracle } from "../../services/curve/curveoracle.mjs";
import { ImplicitFiatConverter } from "../../services/fiatconverters/implicitfiatconverter.mjs";
import { CryptoAsset } from "../../cryptoasset.mjs";
import { RealTokenResolver } from "../../services/realtoken/realtokenresolver.mjs";
import { PortfolioValuationReporter } from "../../services/reporters/valuationreporter.mjs";
import { DefiLlamaOracle } from "../../services/defillama/defillamaoracle.mjs";
import { MakeAccount } from "../../account.mjs";
import { WellKnownCryptoAssets } from "../../wellknowncryptoassets.mjs";
import { OHLCOracle } from "../../services/oracles/ohlcoracle.mjs";
import { CryptoMetadata } from "../../../src/cryptometadata.mjs";

type ErrCode = "T0001";

class CLIError extends Error {
  constructor(code: ErrCode, message?: string) {
    super(`${code} ${message || "Application Error"}`);
  }
}

const ENVVARS = [
  "GNOSISSCAN_API_KEY",
  "COINGECKO_API_KEY",
  "CACHE_PATH",
] as const;
type EnvVars = { [K in (typeof ENVVARS)[number]]: string };

function createCryptoResolver(envvars: EnvVars) {
  return CompositeCryptoResolver.create([
    // My resolvers
    DefaultCryptoResolver.create(),
    CurveResolver.create(),
    RealTokenResolver.create(),
    IgnoreCryptoResolver.create(),
  ]);
}

function createExplorers(registry: CryptoRegistryNG, envvars: EnvVars) {
  return [GnosisScan.create(registry, envvars["GNOSISSCAN_API_KEY"])];
}

async function createOracle(envvars: EnvVars, registry: CryptoRegistryNG) {
  const wellKnownCoingeckoId = WellKnownCryptoAssets.reduce(
    (acc, [key, name, symbol, decimal, metadata]) => {
      acc[key] = metadata.coingeckoId;
      return acc;
    },
    Object.create(null) as InternalToCoinGeckoIdMapping
  );

  return CompositeOracle.create([
    // My oracles
    CurveOracle.create(),
    CoinGeckoOracle.create(envvars["COINGECKO_API_KEY"], wellKnownCoingeckoId),
    DefiLlamaOracle.create(undefined, wellKnownCoingeckoId),
    await OHLCOracle.createFromPath(
      registry.createCryptoAsset("bitcoin"),
      FiatCurrency("EUR"),
      "bitcoin-eur-yahoo.csv",
      {
        origin: "Yahoo",
        dateFormat: "MMM D, YYYY",
        separator: ";",
      }
    ),
    await OHLCOracle.createFromPath(
      registry.createCryptoAsset("bitcoin"),
      FiatCurrency("USD"),
      "bitcoin-usd-yahoo.csv",
      {
        origin: "Yahoo",
        dateFormat: "MMM D, YYYY",
        separator: ";",
      }
    ),
  ]).cache(envvars["CACHE_PATH"]);
}

function loadEnvironmentVariables() {
  const result = {} as EnvVars;

  for (const envvar of ENVVARS) {
    const value = process.env[envvar];
    if (!value) {
      throw new CLIError("T0001", `${envvar} is not set`);
    }

    result[envvar] = value;
  }

  return result;
}

// Configuration model for address processing
type Config = {
  accounts?: ([chain: string, address: string] | [false, unknown[]])[]; // The user accounts. Prefix by `false` to disable.
  addresses?: [chain: string, address: string, data: object][];
  filters?: [filter: object, key: string, value?: unknown][];
};

export async function processAddresses(configPath?: string): Promise<void> {
  // Load configuration from file if provided, otherwise use empty object
  const config = (
    configPath ? JSON.parse(await readFile(configPath, "utf8")) : {}
  ) as Config;

  // Initialize core services and dependencies
  const envvars = loadEnvironmentVariables();
  const resolver = createCryptoResolver(envvars);
  const cryptoRegistry = CryptoRegistryNG.create();
  const cryptoMetadata = CryptoMetadata.create();
  const explorers = createExplorers(cryptoRegistry, envvars);
  const swarm = Swarm.create(
    explorers,
    cryptoRegistry,
    cryptoMetadata,
    resolver
  );

  // Convert hex addresses to internal account objects
  const accounts = await Promise.all(
    (config.accounts ?? []).map(([chain, address]) =>
      chain !== false ? MakeAccount(swarm, chain, address) : null
    )
  );

  // Pre-populate the address table with the user-provided data
  await Promise.all(
    (config.addresses ?? []).map(([chain, address, data]) =>
      swarm.address(asBlockchain(chain), address, data)
    )
  );

  // Load all transfers from the user accounts
  const transfers = await Promise.all(
    accounts.map((account) => (account ? account.loadTransactions(swarm) : []))
  );

  // Create a ledger to track all transfers and their directions
  // This helps identify incoming and outgoing transactions
  const ledger = Ledger.create(...transfers);
  for (const account of accounts) {
    if (account) {
      ledger.from(account).tag("EGRESS");
      ledger.to(account).tag("INGRESS");
    }
  }

  // Apply user-defined filters to categorize transactions
  // This allows for custom tagging of transactions based on rules
  for (const [selector, tag, value] of config.filters ?? []) {
    ledger.filter(cryptoRegistry, cryptoMetadata, selector).tag(tag, value);
  }

  // Create a portfolio representation of all transactions
  const portfolio = ledger.portfolio();

  // Set up price oracle and fiat conversion services
  const bitcoin: CryptoAsset = cryptoRegistry.createCryptoAsset("bitcoin");
  const oracle = await createOracle(envvars, cryptoRegistry);
  const fiatConverter = ImplicitFiatConverter.create(oracle, bitcoin);

  // Calculate the portfolio valuation in EUR
  const valuation = await portfolio.evaluate(
    cryptoRegistry,
    cryptoMetadata,
    oracle,
    fiatConverter,
    FiatCurrency("EUR")
  );

  // Configure display options for the output
  const displayOptions: DisplayOptions = {
    "address.compact": false,
    "address.name": true,
    "amount.value.format": format("16.4"),
  };

  // Generate and output a detailed report
  const reporter = new PortfolioValuationReporter(valuation, displayOptions);
  console.log("%s", reporter.report());
}
