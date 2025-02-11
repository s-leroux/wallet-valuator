import { Blockchain } from "../blockchain.mjs";
import { CryptoAsset } from "../cryptoasset.mjs";
import type { CryptoRegistry } from "../cryptoregistry.mjs";

/**
 * Return type for the `resolve()` method.
 */
export type ResolutionResult =
  | null // No match found.
  | { status: "resolved"; asset: CryptoAsset } // Successfully mapped to a logical crypto-asset.
  | { status: "obsolete" }; // Deprecated or replaced (at least at the given block).

/**
 * Abstract class for resolving blockchain-specific token data to logical crypto assets.
 *
 * A `CryptoResolver` maps a given blockchain token (identified by its chain, block number,
 * and smart contract address) to a logical `CryptoAsset`. This allows treating equivalent
 * assets (e.g., different representations of USDC) as a single entity for accounting purposes.
 *
 * Implementations of this class are expected to provide resolution strategies, typically
 * using a `CryptoRegistry` for metadata lookups.
 */
export abstract class CryptoResolver {
  /**
   * Resolves a token to its corresponding logical `CryptoAsset`.
   *
   * Given a smart contract address, chain, and block number, this method attempts
   * to identify the associated logical `CryptoAsset`. If no match is found, it returns `null`.
   *
   * Implementations may throw an error in exceptional cases, such as when encountering
   * a known invalid or "cancelled" smart contract (specific cases to be defined).
   *
   * @param registry - The `CryptoRegistry` used to store crypto asset's metadata.
   * @param chain - The blockchain
   * @param block - The block number at which the resolution is performed.
   * @param smartContractAddress - The contract address of the token.
   * @param name - The token's name (for reference, not a unique identifier).
   * @param symbol - The token's symbol (for reference, not a unique identifier).
   * @param decimal - The number of decimal places for the token.
   * @returns A `ResolutionResult` promise.
   * @throws May throw an error in exceptional situations (e.g., invalidated contracts).
   */
  abstract resolve(
    registry: CryptoRegistry,
    chain: Blockchain,
    block: number,
    smartContractAddress: string, // XXX Do we have a special value for native coins?
    name: string,
    symbol: string,
    decimal: number
  ): Promise<ResolutionResult>; // ISSUE #43 Shouldn't we throw an exception instead of returning null?
}
