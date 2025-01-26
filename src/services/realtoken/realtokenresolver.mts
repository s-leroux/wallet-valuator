import { NotImplementedError } from "../../error.mjs";

import { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoResolver } from "../cryptoresolver.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";
export type CryptoLike = Pick<CryptoAsset, "symbol">;
import type { RealTokenAPI, RealToken } from "./realtokenapi.mjs";

type MappingEntry<T extends CryptoLike> = {
  crypto: T | null;
  chain: string;
  startBlock: number;
  endBlock: number;
  smartContractAddress: string; // empty string for native currencies
};

type ChainAddress = string & { readonly brand: unique symbol };
function ChainAddress(
  chain: string,
  smartContractAddress: string
): ChainAddress {
  return `${chain}:${smartContractAddress}`.toLowerCase() as ChainAddress;
}

type Entry = {
  crypto?: CryptoAsset; // cached crypto-asset
  data: RealToken; // raw data from the API
};

function cryptoAssetFromEntry(
  entry: Entry,
  name: string,
  symmbol: string,
  decimal: number
): CryptoAsset {
  const crypto = entry.crypto;
  if (crypto) {
    // XXX assert the decimal are consistent with what we alreaady know. This is the only critical field
    // Other "user-supplied" fields are replaced by API values.
    return crypto;
  }

  const { uuid, fullName, symbol } = entry.data;
  return (entry.crypto = new CryptoAsset(uuid, fullName, symbol, decimal));
}

export class RealTokenResolver extends CryptoResolver {
  readonly tokens: Map<ChainAddress, Entry>;

  constructor(readonly api: RealTokenAPI) {
    super();
    this.tokens = new Map();
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
    registry: CryptoRegistry,
    chain: string,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): Promise<CryptoAsset | null> {
    if (!symbol.startsWith("REALTOKEN")) {
      // Not our business
      return null;
    }

    // **Maybe** it is one of our tokens
    const tokens = await this.load();

    const chainAddress = ChainAddress(chain, smartContractAddress);
    const entry = this.tokens.get(chainAddress);
    if (!entry) {
      // Not our business
      // TODO Log this event as it is suspicious.
      return null;
    }

    return cryptoAssetFromEntry(entry, name, symbol, decimal);
  }

  get(crypto_id: string): Promise<CryptoAsset | null> {
    throw new NotImplementedError();
  }
}
