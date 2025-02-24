import { Swarm } from "../../../src/swarm.mjs";
import { Ledger } from "../../../src/ledger.mjs";
import { GnosisScan } from "../../../src/services/explorers/gnosisscan.mjs";
import { CompositeCryptoResolver } from "../../../src/services/cryptoresolvers/compositecryptoresolver.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { asBlockchain } from "../../blockchain.mjs";
import { format, toDisplayString } from "../../displayable.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import { FiatConverter } from "../../services/fiatconverter.mjs";
import { CompositeOracle } from "../../services/oracles/compositeoracle.mjs";
import { CoinGecko } from "../../services/oracles/coingecko.mjs";
import { IgnoreCryptoResolver } from "../../services/cryptoresolvers/ignorecryptoresolver.mjs";

type ErrCode = "T0001";

class CLIError extends Error {
  constructor(code: ErrCode, message?: string) {
    super(`${code} ${message || "Application Error"}`);
  }
}

const ENVVARS = ["GNOSISSCAN_API_KEY", "COINGECKO_API_KEY"] as const;
type EnvVars = { [K in typeof ENVVARS[number]]: string };

function createCryptoResolver(envvars: EnvVars) {
  return CompositeCryptoResolver.create([
    // My resolvers
    IgnoreCryptoResolver.create(),
  ]);
}

function createExplorers(envvars: EnvVars) {
  return [GnosisScan.create(envvars["GNOSISSCAN_API_KEY"])];
}

function createOracle(envvars: EnvVars) {
  return CompositeOracle.create([
    // My oracles
    CoinGecko.create(envvars["COINGECKO_API_KEY"]),
  ]).cache();
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

export async function processAddresses(hexAddresses: string[]): Promise<void> {
  const envvars = loadEnvironmentVariables();
  const resolver = createCryptoResolver(envvars);
  const explorers = createExplorers(envvars);
  const registry = CryptoRegistry.create();
  const swarm = Swarm.create(explorers, registry, resolver);
  const chain = asBlockchain("gnosis");
  const addresses = await Promise.all(
    hexAddresses.map((hexAddress) =>
      swarm.address(chain, registry, resolver, hexAddress)
    )
  );

  const transfers = await Promise.all(
    addresses.map((address) =>
      address.allValidTransfers(swarm, registry, resolver)
    )
  );
  const ledger = Ledger.create(...transfers);
  for (const address of addresses) {
    ledger.from(address).tag("EGRESS");
    ledger.to(address).tag("INGRESS");
  }

  const portfolio = ledger.portfolio();

  const oracle = createOracle(envvars);
  const valuation = await portfolio.evaluate(
    registry,
    oracle,
    null as unknown as FiatConverter,
    FiatCurrency("EUR")
  );

  console.log(
    "%s",
    toDisplayString(valuation, {
      "address.compact": true,
      "amount.value.format": format("16.4"),
    })
  );
}
