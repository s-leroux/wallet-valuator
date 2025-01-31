import { CryptoAsset } from "../cryptoasset.mjs";
import type { CryptoRegistry } from "../cryptoregistry.mjs";

/**
 * Resolves a smart contract address to a logical crypto-asset.
 *
 * This function determines the logical crypto-asset associated with a given
 * smart contract address on a specific chain and block number. The behavior
 * depends on the state of the smart contract address:
 *
 * - If the smart contract address is unknown, a dedicated logical crypto-asset
 *   is created dynamically.
 * - If the smart contract address is known, but the block number falls outside
 *   any defined range, an error is raised.
 * - If the smart contract address is disabled at the specified block, this
 *   function returns `null`. Transactions involving a disabled address should
 *   be ignored.
 *
 * @param registry - The crypto-asset registry
 * @param chain - The blockchain identifier (e.g., "Ethereum").
 * @param block - The block number for context.
 * @param smartContractAddress - The address of the smart contract.
 * @param name - The supposed name of the token.
 * @param symbol - The supposed symbol of the token.
 * @param decimal - The number of decimals used by the token.
 * @returns The resolved `Currency` instance or `null` if the address is disabled.
 * @throws An error if the block number is outside any defined range for the address.
 */
export abstract class CryptoResolver {
  /**
   * Resolve a token identified by its chain, block, and contract address to a logical
   * crypto-asset.
   *
   * A new token and the corresponding crypto-asset are created if needed.
   *
   * This method returns `null` only if the contract was explicitly disabled (e.g.:
   * the contract was updated at a given block and is not longer valid).
   */
  abstract resolve(
    registry: CryptoRegistry,
    chain: string,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): Promise<CryptoAsset | null>; // ISSUE #43 Shouldn't we throw an exception instead of returning null?

  /**
   * Return a logical crypto-asset from its internal `id`.
   * Return `null` if the given `id` is not in the database.
   */
  abstract get(crypto_id: string): Promise<CryptoAsset | null>; // ISSUE #43 Shouldn't we throw an exception instead of returning null?
}
