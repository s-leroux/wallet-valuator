import { Currency } from "../currency.mjs";

/**
 * Resolves a smart contract address to a logical currency.
 *
 * This function determines the logical currency associated with a given
 * smart contract address on a specific chain and block number. The behavior
 * depends on the state of the smart contract address:
 *
 * - If the smart contract address is unknown, a dedicated logical currency
 *   is created dynamically.
 * - If the smart contract address is known, but the block number falls outside
 *   any defined range, an error is raised.
 * - If the smart contract address is disabled at the specified block, this
 *   function returns `null`. Transactions involving a disabled address should
 *   be ignored.
 *
 * @param chain - The blockchain identifier (e.g., "Ethereum").
 * @param block - The block number for context.
 * @param smartContractAddress - The address of the smart contract.
 * @param name - The supposed name of the token.
 * @param symbol - The supposed symbol of the token.
 * @param decimal - The number of decimals used by the token.
 * @returns The resolved `Currency` instance or `null` if the address is disabled.
 * @throws An error if the block number is outside any defined range for the address.
 */
export abstract class CurrencyResolver {
  abstract resolve(
    chain: string,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): Currency | null;
}

export class CurrencyDB {
  private currencyMap: Map<string, Currency>;

  constructor() {
    this.currencyMap = new Map();
  }

  getCurrency(id: string): Currency {
    const currency = this.currencyMap.get(id);
    if (!currency) {
      throw new Error(`Currency with ID ${id} not found`);
    }
    return currency;
  }

  set(id: string, currency: Currency): void {
    this.currencyMap.set(id, currency);
  }
}
