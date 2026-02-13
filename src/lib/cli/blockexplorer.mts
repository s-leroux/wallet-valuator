import { Swarm } from "../../../src/swarm.mjs";
import { GnosisScan } from "../../../src/services/explorers/gnosisscan.mjs";
import { LazyCryptoResolver } from "../../../src/services/cryptoresolvers/lazycryptoresolver.mjs";
import { CompositeCryptoResolver } from "../../../src/services/cryptoresolvers/compositecryptoresolver.mjs";
import { CryptoRegistryNG } from "../../../src/cryptoregistry.mjs";
import { asBlockchain } from "../../blockchain.mjs";
import { format, toDisplayString } from "../../displayable.mjs";
import { Address } from "../../address.mjs";
import { CryptoMetadata } from "../../../src/cryptometadata.mjs";

type ErrCode = "T0001";

class CLIError extends Error {
  constructor(code: ErrCode, message?: string) {
    super(`${code} ${message || "Application Error"}`);
  }
}

const ENVVARS = ["ETHERSCAN_API_KEY"] as const;
type EnvVars = { [K in (typeof ENVVARS)[number]]: string };

function createCryptoResolver(envvars: EnvVars) {
  return CompositeCryptoResolver.create([
    // My resolvers
    LazyCryptoResolver.create(),
  ]);
}

function createExplorers(registry: CryptoRegistryNG, envvars: EnvVars) {
  return [GnosisScan.create(registry, envvars["ETHERSCAN_API_KEY"])];
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

export async function processBlock(blockNumbers: number[]): Promise<void> {
  const envvars = loadEnvironmentVariables();
  const resolver = createCryptoResolver(envvars);
  const cryptoRegistry = CryptoRegistryNG.create();
  const cryptoMetadata = CryptoMetadata.create();
  const explorers = createExplorers(cryptoRegistry, envvars);
  const swarm = Swarm.create(
    explorers,
    cryptoRegistry,
    cryptoMetadata,
    resolver,
  );
  const chain = asBlockchain("gnosis");
  const blocks = await Promise.all(
    blockNumbers.map((blockNumber) => swarm.block(chain, blockNumber)),
  );

  const addresses = new Map<Address, number>();
  await Promise.all(
    blocks.map((block) =>
      block.internalTransactions(swarm).then((transfers) =>
        transfers.forEach((transfer) => {
          addresses.set(transfer.from, 0);
          if (transfer.to) addresses.set(transfer.to, 0);
        }),
      ),
    ),
  );

  await Promise.all(
    Array.from(addresses.keys()).map(async (address: Address) => {
      try {
        const transfers = await address.tokenTransfers(swarm);
        addresses.set(address, transfers.length);
      } catch {
        addresses.set(address, Infinity);
      }
    }),
  );

  console.log(
    "%s",
    toDisplayString(Array.from(addresses.entries()), {
      "address.compact": false,
      "amount.value.format": format("6.4"),
    }),
  );
}
