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

  /**
   * Convert the ChainAddress instance to a string for user consumption.
   *
   * The current implementation forwards to the mangleChainAddress() function,
   * but this behavior is not guaranteed. If you need a stable string
   * representation of a ChainAddress, you should call mangleChainAddress() directly.
   *
   * @returns A string representation of the ChainAddress
   */
  toString() {
    return mangleChainAddress(this);
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
    () => new StandardChainAddress(chain, address)
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
