import { NotImplementedError } from "../../error.mjs";

import { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoResolver, ResolutionResult } from "../cryptoresolver.mjs";
import type {
  CryptoAssetMetadata,
  CryptoMetadata,
  CryptoRegistryNG,
} from "../../cryptoregistry.mjs";
import {
  type RealTokenAPI,
  type RealToken,
  DefaultRealTokenAPI,
} from "./realtokenapi.mjs";
import type { Blockchain } from "../../blockchain.mjs";
import type { Swarm } from "../../swarm.mjs";
import { Semaphore } from "../../semaphore.mjs";

export type CryptoLike = Pick<CryptoAsset, "symbol">;

const realTokenAPISemaphore = new Semaphore(1);

// XXX: Why not use ChainAddress from ../../chainaddress.mjs?
type ChainAddress = string & { readonly brand: unique symbol };
function ChainAddress(
  chain: string,
  smartContractAddress: string,
): ChainAddress {
  return `${chain}:${smartContractAddress}`.toLowerCase() as ChainAddress;
}

// XXX: We don't need this extra layer of encapsulation. Just use the RealToken type directly.
type Entry = {
  data: RealToken; // raw data from the API
};

export interface RealTokenMetadata extends CryptoAssetMetadata {
  "realtoken.uuid": string;
}

/**
 * Return the logical crypto-asset associated with an entry.
 */
function cryptoAssetFromEntry(
  registry: CryptoRegistryNG,
  metadata: CryptoMetadata,
  entry: Entry,
  _name: string,
  _symbol: string,
  decimal: number,
): CryptoAsset {
  // ISSUE #65 assert the decimal are consistent with what we alreaady know. This is the only critical field
  // Other "user-supplied" fields are replaced by API values.

  const { uuid, fullName, symbol } = entry.data;
  const crypto = registry.createCryptoAsset(
    uuid.toLowerCase(),
    fullName,
    symbol,
    decimal,
  );

  // Record domain specific metadata
  metadata.setMetadata<RealTokenMetadata>(crypto, {
    resolver: "realtoken",
    fiscalCategory: "SECURITY",
    "realtoken.uuid": uuid,
  });

  return crypto;
}

export class RealTokenResolver extends CryptoResolver {
  readonly tokens: Map<ChainAddress, Entry>;

  constructor(readonly api: RealTokenAPI) {
    super();
    this.tokens = new Map();
  }

  static create(api?: RealTokenAPI | string) {
    let resolvedAPI: RealTokenAPI;

    if (typeof api === "string") {
      resolvedAPI = DefaultRealTokenAPI.create(api);
    } else if (api === undefined) {
      resolvedAPI = DefaultRealTokenAPI.create(null);
    } else {
      resolvedAPI = api;
    }

    return new RealTokenResolver(resolvedAPI);
  }

  async load() {
    const tokens = this.tokens;

    if (tokens.size === 0) {
      // We assume we haven't loaded the tokens yet
      for (const token of await this.api.token()) {
        const entry = { data: token };
        const ethereumContract = token.ethereumContract;
        if (ethereumContract) {
          tokens.set(ChainAddress("ethereum", ethereumContract), entry);
        }

        const gnosisContract = token.gnosisContract;
        if (gnosisContract) {
          tokens.set(ChainAddress("gnosis", gnosisContract), entry);
        }

        const xDaiContract = token.xDaiContract;
        if (xDaiContract) {
          tokens.set(ChainAddress("xdai", xDaiContract), entry);
        }
      }
    }

    return tokens;
  }

  async resolve(
    swarm: Swarm,
    cryptoMetadata: CryptoMetadata,
    chain: Blockchain,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number,
  ): Promise<ResolutionResult> {
    if (!symbol.startsWith("REALTOKEN")) {
      // Not our business
      return null;
    }

    // **Maybe** it is one of our tokens
    const tokens = await realTokenAPISemaphore.do(() => this.load());

    const chainAddress = ChainAddress(chain.id, smartContractAddress);
    const entry = tokens.get(chainAddress);
    if (!entry) {
      // Not our business
      // ISSUE #66 Log this event as it is suspicious.
      return null;
    }

    return {
      status: "resolved",
      asset: cryptoAssetFromEntry(
        swarm.cryptoRegistry,
        cryptoMetadata,
        entry,
        name,
        symbol,
        decimal,
      ),
    };
  }

  get(crypto_id: string): Promise<CryptoAsset | null> {
    throw new NotImplementedError();
  }
}
