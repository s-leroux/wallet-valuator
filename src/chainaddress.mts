import { Blockchain } from "./blockchain.mjs";

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
