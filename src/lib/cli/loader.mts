import { Swarm } from "../../../src/swarm.mjs";
import { Ledger } from "../../../src/ledger.mjs";
import { GnosisScan } from "../../../src/services/explorers/gnosisscan.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { asBlockchain } from "../../blockchain.mjs";
import { format, toDisplayString } from "../../displayable.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import { FiatConverter } from "../../services/fiatconverter.mjs";
import { CompositeOracle } from "../../services/oracles/compositeoracle.mjs";
import { CoinGeckoOracle } from "../../services/oracles/coingecko.mjs";
import { DefaultCryptoResolver } from "../../services/cryptoresolvers/defaultcryptoresolver.mjs";
import { parseDate } from "../../date.mjs";
import { PriceMap } from "../../services/oracle.mjs";

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
  return DefaultCryptoResolver.create();
}

function createExplorers(registry: CryptoRegistry, envvars: EnvVars) {
  return [GnosisScan.create(registry, envvars["GNOSISSCAN_API_KEY"])];
}

function createOracle(envvars: EnvVars) {
  return CompositeOracle.create([
    // My oracles
    CoinGeckoOracle.create(envvars["COINGECKO_API_KEY"]),
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

function notFound(id: string): never {
  throw new CLIError("T0001", `Crypto ${id} not found`);
}

export async function load(start: string, end: string, cryptoids: string[]) {
  const currDate = parseDate("YYYY-MM-DD", start);
  const endDate = parseDate("YYYY-MM-DD", end);

  const envvars = loadEnvironmentVariables();
  const resolver = createCryptoResolver(envvars);
  const registry = CryptoRegistry.create();
  const oracle = createOracle(envvars);

  if (!cryptoids.length) {
    cryptoids = Array.from(resolver.getCryptoIds());
  }

  const cryptos = cryptoids.map(
    (id) => resolver.getCryptoAsset(registry, id) ?? notFound(id)
  );

  while (currDate <= endDate) {
    // Create a single PriceMap that will be shared across all getPrice calls.
    // This is safe in JavaScript because:
    // 1. JavaScript is single-threaded, so Map operations are atomic
    // 2. Even though we use Promise.all() for concurrent execution, the actual
    //    Map modifications happen sequentially in the event loop
    const prices = new Map() as PriceMap;
    await Promise.all(
      cryptos.map((crypto) => {
        return oracle.getPrice(
          registry,
          crypto,
          currDate,
          new Set([FiatCurrency("EUR")]),
          prices
        );
      })
    );

    currDate.setDate(currDate.getDate() + 1);
  }
}

export async function processAddresses(hexAddresses: string[]): Promise<void> {
  const envvars = loadEnvironmentVariables();
  const resolver = createCryptoResolver(envvars);
  const registry = CryptoRegistry.create();
  const explorers = createExplorers(registry, envvars);
  const swarm = Swarm.create(explorers, registry, resolver);
  const chain = asBlockchain("gnosis");
  const addresses = await Promise.all(
    hexAddresses.map((hexAddress) => swarm.address(chain, hexAddress))
  );

  const transfers = await Promise.all(
    addresses.map((address) => address.allValidTransfers(swarm))
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
