import { Blockchain } from "./blockchain.mjs";
import { DisplayOptions, toDisplayString } from "./displayable.mjs";
import { InstanceCache } from "./instancecache.mjs";

/**
 * A glorified string with normalized format used to represent a globally unique
 * account across all CEX and Blockchains.
 *
 * Format: "chain:address" where address is optional for native chain tokens
 */
export type ChainAddress = string & { readonly brand: unique symbol };

/**
 * Creates a normalized ChainAddress string from chain and optional contract address
 * @param chain - The blockchain name
 * @param smartContractAddress - Optional contract address, null for native tokens
 * @returns Normalized lowercase string in format "chain:address"
 */
export function ChainAddress(
  chain: string | Blockchain,
  smartContractAddress: string | null
): ChainAddress {
  return `${chain}:${smartContractAddress || ""}`.toLowerCase() as ChainAddress;
}

export interface ChainAddressNG {
  readonly chain: Blockchain;
  readonly address: string | null;

  // toString(): string;
  // toDisplayString(options: DisplayOptions): string;
}

class StandardChainAddress implements ChainAddressNG {
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

const chainAddressCache = new InstanceCache<string, ChainAddressNG>();

export function ChainAddressNG(
  chain: string | Blockchain,
  address: string | null
): ChainAddressNG {
  const key = `${chain}:${address || ""}`.toLowerCase();
  return chainAddressCache.getOrCreate(
    key,
    StandardChainAddress,
    chain,
    address
  );
}

/**
 * Formats a ChainAddressNG into a string in the format "<chain>:<address>"
 * @param chainAddress - The ChainAddressNG to format
 * @returns A string in the format "<chain>:<address>"
 */
export function mangleChainAddress(chainAddress: ChainAddressNG): string {
  return `${chainAddress.chain}:${chainAddress.address || ""}`;
}
