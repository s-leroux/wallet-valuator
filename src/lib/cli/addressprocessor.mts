import { Swarm } from "../../../src/swarm.mjs";
import { Ledger } from "../../../src/ledger.mjs";
import { Portfolio } from "../../../src/portfolio.mjs";
import { TestScan } from "../../../src/services/explorers/testscan.mjs";
import { GnosisScan } from "../../../src/services/explorers/gnosisscan.mjs";
import { LazyCryptoResolver } from "../../../src/services/cryptoresolvers/lazycryptoresolver.mjs";
import { CompositeCryptoResolver } from "../../../src/services/cryptoresolvers/compositecryptoresolver.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";
import { asBlockchain } from "../../blockchain.mjs";
import { format, toDisplayString } from "../../displayable.mjs";

type ErrCode = "T0001";

class CLIError extends Error {
  constructor(code: ErrCode, message?: string) {
    super(`${code} ${message || "Application Error"}`);
  }
}

const ENVVARS = ["GNOSISSCAN_API_KEY"] as const;
type EnvVars = { [K in typeof ENVVARS[number]]: string };

function createCryptoResolver(envvars: EnvVars) {
  return CompositeCryptoResolver.create([LazyCryptoResolver.create()]);
}

function createExplorers(envvars: EnvVars) {
  return [GnosisScan.create(envvars["GNOSISSCAN_API_KEY"])];
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

export async function processAddresses(addresses: string[]): Promise<void> {
  const envvars = loadEnvironmentVariables();
  const resolver = createCryptoResolver(envvars);
  const explorers = createExplorers(envvars);
  const registry = CryptoRegistry.create();
  const swarm = Swarm.create(explorers, registry, resolver);

  const transfers = await Promise.all(
    addresses.map((address) =>
      swarm
        .address(asBlockchain("gnosis"), registry, resolver, address)
        .then((address) => address.allValidTransfers(swarm, registry, resolver))
    )
  );

  const ledger = Ledger.create(...transfers);
  console.log(
    "%s",
    toDisplayString(ledger, {
      "address.compact": true,
      "amount.value.format": format("16.4"),
    })
  );
}
