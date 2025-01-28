import { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoResolver } from "../cryptoresolver.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";

const wellKnownCryptos: [
  id: string,
  name: string,
  symbol: string,
  decimal: number
][] = [
  ["monerium-eur-money", "Monerium EUR emoney", "EURe", 18],
  ["binancecoin", "Binance Coin", "BNB", 18],
  ["bitcoin", "bitcoin", "BTC", 8],
  ["dai", "Dai Stablecoin", "DAI", 18],
  ["ethereum", "ethereum", "ETH", 18],
  ["solana", "Solana", "SOL", 9],
  ["tether", "Tether USD", "USDT", 6],
  ["usd-coin", "USDC", "USDC", 6],
];

export const wellKnownTransitions: [
  crypto_id: string | null,
  chain: string,
  startBlock: number,
  endBlock: number,
  smartContractAddress: string
][] = [
  ["ethereum", "ethereum", 0, Infinity, ""],
  [
    "monerium-eur-money",
    "ethereum",
    0,
    21419971,
    "0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f",
  ],
  [
    "monerium-eur-money",
    "ethereum",
    21419972,
    Infinity,
    "0x39b8B6385416f4cA36a20319F70D28621895279D",
  ],
  [
    "monerium-eur-money",
    "polygon",
    0,
    60733236,
    "0x18ec0A6E18E5bc3784fDd3a3634b31245ab704F6",
  ],
  [
    "monerium-eur-money",
    "polygon",
    60733237,
    Infinity,
    "0xE0aEa583266584DafBB3f9C3211d5588c73fEa8d",
  ],
  [
    "monerium-eur-money",
    "gnosis",
    0,
    35656950,
    "0xcB444e90D8198415266c6a2724b7900fb12FC56E",
  ],
  [
    null,
    "gnosis",
    35656951,
    Infinity,
    "0xcB444e90D8198415266c6a2724b7900fb12FC56E",
  ],
  [
    "monerium-eur-money",
    "gnosis",
    35656951,
    Infinity,
    "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430",
  ],
];

export type CryptoLike = Pick<CryptoAsset, "symbol">;

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

export class DefaultCryptoResolver extends CryptoResolver {
  private cryptos: Map<string, CryptoAsset>;
  private transitions: Map<ChainAddress, MappingEntry<CryptoAsset>[]>;
  private seq: number;

  constructor() {
    super();
    this.transitions = new Map();
    this.seq = 0;

    const cryptos = (this.cryptos = new Map());
    for (const [id, name, symbol, decimal] of wellKnownCryptos) {
      cryptos.set(id, new CryptoAsset(id, name, symbol, decimal));
    }

    // register chain:address => (crypto, ...) for all known transitions
    for (const [
      crypto_id,
      chain,
      startBlock,
      endBlock,
      smartContractAddress,
    ] of wellKnownTransitions) {
      const key = ChainAddress(chain, smartContractAddress);
      let transitions = this.transitions.get(key);
      if (!transitions) {
        transitions = [];
        this.transitions.set(key, transitions);
      }

      transitions.push({
        crypto: crypto_id ? cryptos.get(crypto_id) || null : null,
        chain,
        startBlock,
        endBlock,
        smartContractAddress,
      });
    }
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
    const chainAddress = ChainAddress(chain, smartContractAddress);
    const transitions = this.transitions.get(chainAddress);
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
        return transition.crypto;
      }
    }
    return null;
    throw new Error(
      `Cannot resolve crypto-asset ${symbol}(?) address ${chainAddress} at block ${block}`
    );
  }

  register(
    chainAddress: ChainAddress,
    chain: string,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): CryptoAsset {
    const id = `unknown-${this.seq++}-${symbol.toLowerCase()}`;
    const crypto = new CryptoAsset(id, name, symbol, decimal);
    this.cryptos.set(id, crypto);
    this.transitions.set(chainAddress, [
      {
        crypto: crypto,
        chain,
        startBlock: 0,
        endBlock: Infinity,
        smartContractAddress,
      },
    ]);

    return crypto;
  }

  async get(crypto_id: string): Promise<CryptoAsset | null> {
    return this.cryptos.get(crypto_id) ?? null;
  }
}
