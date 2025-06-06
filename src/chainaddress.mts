import { Blockchain } from "./blockchain.mjs";
import { DisplayOptions, toDisplayString } from "./displayable.mjs";
import { InstanceCache } from "./instancecache.mjs";

export interface ChainAddress {
  readonly chain: Blockchain;
  readonly address: string | null;
}

class StandardChainAddress implements ChainAddress {
  readonly chain: Blockchain;
  readonly address: string | null;

  constructor(chain: string | Blockchain, address: string | null) {
    // Normalize input data
    this.chain = typeof chain === "string" ? Blockchain.create(chain) : chain;
    this.address = address ? address.toLowerCase() : address;
  }

  toString() {
    return `${this.chain}:${this.address || ""}`;
  }

  toDisplayString(options: DisplayOptions): string {
    return `${toDisplayString(this.chain, options)}:${this.address || ""}`;
  }
}

const chainAddressCache = new InstanceCache<string, ChainAddress>();

export function ChainAddress(
  chain: string | Blockchain,
  address: string | null
): ChainAddress {
  const key = `${chain}:${address || ""}`.toLowerCase();
  return chainAddressCache.getOrCreate(
    key,
    StandardChainAddress,
    chain,
    address
  );
}

/**
 * Formats a ChainAddress into a string in the format "<chain>:<address>"
 * Formats a ChainAddress into a string in the format "<chain>:<address>"
 * @param chainAddress - The ChainAddress to format
 * @returns A string in the format "<chain>:<address>"
 */
export function mangleChainAddress(chainAddress: ChainAddress): string {
  return `${chainAddress.chain}:${chainAddress.address || ""}`;
}
