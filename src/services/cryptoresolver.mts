import { Blockchain } from "../blockchain.mjs";
import { CryptoAsset } from "../cryptoasset.mjs";
import { CryptoMetadata } from "../cryptoregistry.mjs";
import { Swarm } from "../swarm.mjs";

/**
 * Return type for the `resolve()` method.
 */
export type ResolutionResult =
  | null // No match found.
  | { status: "resolved"; asset: CryptoAsset } // Successfully mapped to a logical crypto-asset.
  | { status: "obsolete" } // Deprecated or replaced (at least at the given block).
  | { status: "ignore" }; // Ignore that crypto-asset (imply a zero value)

/**
 * Abstract class for resolving blockchain-specific token data to logical crypto assets.
 *
 * A `CryptoResolver` maps a *physical* crypto-asset — identified by its chain, block
 * number, and smart contract address — to a **logical** {@link CryptoAsset}. The
 * physical crypto-asset is not a separate class; it is simply the combination of a
 * chain-address and on-chain token data (name, symbol, decimals) passed as arguments
 * to {@link resolve}.
 *
 * Multiple physical tokens may resolve to the **same** logical `CryptoAsset` (e.g.
 * USDC on Ethereum, Polygon, and Arbitrum all map to the logical asset `"usdc"`).
 * This allows treating equivalent assets as a single entity for accounting purposes.
 *
 * If no resolver recognises a physical token, a catch-all resolver (such as
 * `LazyCryptoResolver`) may create a *singleton* logical `CryptoAsset` whose id is
 * derived from the chain-address itself. See {@link CryptoAsset} for details.
 *
 * Implementations of this class are expected to provide resolution strategies, typically
 * using a `CryptoRegistry` for metadata lookups.
 */
export abstract class CryptoResolver {
  /**
   * Resolves a physical token to its corresponding logical `CryptoAsset`.
   *
   * The physical token is described by the combination of `chain`,
   * `smartContractAddress`, and metadata (`name`, `symbol`,
   * `decimal`). These arguments are the only representation of a "physical
   * crypto-asset" in the system — there is no dedicated class for it.
   *
   * If the resolver recognises the token, it returns a {@link ResolutionResult}
   * containing the logical `CryptoAsset`. If no match is found, it returns
   * `null` so that the next resolver in the chain can try.
   *
   * Implementations may throw an error in exceptional cases, such as when
   * encountering a known invalid or "cancelled" smart contract (specific cases
   * to be defined).
   *
   * @param chain - The blockchain on which the token exists.
   * @param block - The block number at which the resolution is performed.
   * @param smartContractAddress - The contract address of the token.
   * @param name - The token's name (for reference, not a unique identifier).
   * @param symbol - The token's symbol (for reference, not a unique identifier).
   * @param decimal - The number of decimal places for the token.
   * @returns A `ResolutionResult` promise.
   * @throws May throw an error in exceptional situations (e.g., invalidated contracts).
   */
  abstract resolve(
    swarm: Swarm,
    cryptoMetadata: CryptoMetadata,
    chain: Blockchain,
    block: number,
    smartContractAddress: string, // ISSUE #97 Do we have a special value for native coins?
    name: string,
    symbol: string,
    decimal: number,
  ): Promise<ResolutionResult>; // ISSUE #43 Shouldn't we throw an exception instead of returning null?
}
