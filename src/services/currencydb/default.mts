import { Currency } from "../../currency.mjs";
import { CurrencyResolver, CurrencyDB } from "../currencydb.mjs";

const wellKnownCurrencies: [
  id: string,
  name: string,
  symbol: string,
  decimal: number
][] = [
  ["ETH", "Ethereum", "ETH", 18],
  ["EURe", "Monerium EURe", "EURe", 18],
];

export const wellKnownTransitions: [
  currency_id: string | null,
  chain: string,
  startBlock: number,
  endBlock: number,
  smartContractAddress: string
][] = [
  ["ETH", "ethereum", 0, Infinity, ""],
  [
    "EURe",
    "ethereum",
    0,
    21419971,
    "0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f",
  ],
  [
    "EURe",
    "ethereum",
    21419972,
    Infinity,
    "0x39b8B6385416f4cA36a20319F70D28621895279D",
  ],
  [
    "EURe",
    "polygon",
    0,
    60733236,
    "0x18ec0A6E18E5bc3784fDd3a3634b31245ab704F6",
  ],
  [
    "EURe",
    "polygon",
    60733237,
    Infinity,
    "0xE0aEa583266584DafBB3f9C3211d5588c73fEa8d",
  ],
  ["EURe", "gnosis", 0, 35656950, "0xcB444e90D8198415266c6a2724b7900fb12FC56E"],
  [
    null,
    "gnosis",
    35656951,
    Infinity,
    "0xcB444e90D8198415266c6a2724b7900fb12FC56E",
  ],
  [
    "EURe",
    "gnosis",
    35656951,
    Infinity,
    "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430",
  ],
];

export class DefaultCurrencyDB extends CurrencyDB {
  constructor() {
    super();
    for (const [id, name, symbol, decimal] of wellKnownCurrencies) {
      this.set(id, new Currency(name, symbol, decimal));
    }
  }
}

export type CurrencyLike = Pick<Currency, "symbol">;

type MappingEntry<T extends CurrencyLike> = {
  currency: T | null;
  chain: string; // XXX Is this property required?
  startBlock: number;
  endBlock: number;
  smartContractAddress: string;
};

type ChainAddress = string & { readonly brand: unique symbol };
function toChainAddress(
  chain: string,
  smartContractAddress: string
): ChainAddress {
  return `${chain}:${smartContractAddress}`.toLowerCase() as ChainAddress;
}

export class DefaultCurrencyResolver extends CurrencyResolver {
  private transitionMap: Map<ChainAddress, MappingEntry<Currency>[]>;

  constructor() {
    super();
    this.transitionMap = new Map();

    const currencies: Map<string, Currency> = new Map();
    for (const [id, name, symbol, decimal] of wellKnownCurrencies) {
      currencies.set(id, new Currency(name, symbol, decimal));
    }
    for (const [
      currency_id,
      chain,
      startBlock,
      endBlock,
      smartContractAddress,
    ] of wellKnownTransitions) {
      const key = toChainAddress(chain, smartContractAddress);
      let transitions = this.transitionMap.get(key);
      if (!transitions) {
        transitions = [];
        this.transitionMap.set(key, transitions);
      }

      transitions.push({
        currency: currency_id ? currencies.get(currency_id) || null : null,
        chain,
        startBlock,
        endBlock,
        smartContractAddress,
      });
    }
  }

  resolve(
    chain: string,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): Currency | null {
    const chainAddress = toChainAddress(chain, smartContractAddress);
    const transitions = this.transitionMap.get(chainAddress);
    if (!transitions) {
      return this.register(
        chainAddress,
        chain,
        smartContractAddress,
        name,
        symbol,
        decimal
      );
    }
    for (const transition of transitions) {
      if (block >= transition.startBlock && block <= transition.endBlock) {
        return transition.currency;
      }
    }
    throw new Error(
      `Cannot resolve currency ${symbol}(?) address ${chainAddress} at block ${block}`
    );
  }

  register(
    chainAddress: ChainAddress,
    chain: string,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): Currency {
    const currency = new Currency(name, symbol, decimal);
    this.transitionMap.set(chainAddress, [
      {
        currency,
        chain,
        startBlock: 0,
        endBlock: Infinity,
        smartContractAddress,
      },
    ]);

    return currency;
  }
}
