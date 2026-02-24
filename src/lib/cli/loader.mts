import { CryptoRegistryNG } from "../../../src/cryptoregistry.mjs";
import { format, toDisplayString } from "../../displayable.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import { CompositeOracle } from "../../services/oracles/compositeoracle.mjs";
import { CoinGeckoOracle } from "../../services/oracles/coingecko.mjs";
import { DefaultCryptoResolver } from "../../services/cryptoresolvers/defaultcryptoresolver.mjs";
import { parseDate } from "../../date.mjs";
import { PriceMap } from "../../services/oracle.mjs";
import { CryptoMetadata } from "../../../src/cryptoregistry.mjs";

type ErrCode = "T0001";

class CLIError extends Error {
  constructor(code: ErrCode, message?: string) {
    super(`${code} ${message || "Application Error"}`);
  }
}

const ENVVARS = [
  "ETHERSCAN_API_KEY",
  "COINGECKO_API_KEY",
  "CACHE_PATH",
] as const;
type EnvVars = { [K in (typeof ENVVARS)[number]]: string };

function createCryptoResolver(envvars: EnvVars) {
  return DefaultCryptoResolver.create();
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
  const cryptoRegistry = CryptoRegistryNG.create();
  const cryptoMetadata = CryptoMetadata.create();
  const oracle = createOracle(envvars);

  if (!cryptoids.length) {
    cryptoids = Array.from(resolver.getCryptoIds());
  }

  const cryptos = cryptoids.map(
    (id) =>
      resolver.getCryptoAsset(cryptoRegistry, cryptoMetadata, id) ??
      notFound(id),
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
          cryptoRegistry,
          cryptoMetadata,
          crypto,
          currDate,
          new Set([FiatCurrency("EUR")]),
          prices,
        );
      }),
    );

    console.log(
      "%s",
      toDisplayString(prices, {
        "address.compact": true,
        "amount.value.format": format("16.4"),
      }),
    );

    currDate.setDate(currDate.getDate() + 1);
  }
}
