import { readFile } from "node:fs/promises";

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
import { DefaultCryptoResolver } from "../../services/cryptoresolvers/defaultcryptoresolver.mjs";
import { ChainAddress } from "../../chainaddress.mjs";
import { Address } from "../../address.mjs";

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

type Config = {
  addresses?: [chain: string, address: string, data: object][];
  filters?: [filter: object, key: string, value?: unknown][];
};
export async function processAddresses(
  hexAddresses: string[],
  configPath?: string
): Promise<void> {
  const config = (
    configPath ? JSON.parse(await readFile(configPath, "utf8")) : {}
  ) as Config;

  const envvars = loadEnvironmentVariables();
  const resolver = createCryptoResolver(envvars);
  const explorers = createExplorers(envvars);
  const registry = CryptoRegistry.create();
  const swarm = Swarm.create(explorers, registry, resolver);
  const chain = asBlockchain("gnosis");
  const addresses = await Promise.all(
    hexAddresses.map((hexAddress) => swarm.address(chain, hexAddress))
  );

  await Promise.all(
    (config.addresses ?? []).map(([chain, address, data]) =>
      swarm.address(asBlockchain(chain), address, data)
    )
  );

  const transfers = await Promise.all(
    addresses.map((address) => address.allValidTransfers(swarm))
  );
  const ledger = Ledger.create(...transfers);
  for (const address of addresses) {
    ledger.from(address).tag("EGRESS");
    ledger.to(address).tag("INGRESS");
  }

  for (const [selector, tag, value] of config.filters ?? []) {
    ledger.filter(registry, selector).tag(tag, value);
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
      "address.compact": false,
      "address.name": true,
      "amount.value.format": format("16.4"),
    })
  );
}
