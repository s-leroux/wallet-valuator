import { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoResolver, CryptoDB } from "../cryptodb.mjs";

const wellKnownCryptos: [
  id: string,
  name: string,
  symbol: string,
  decimal: number
][] = [
  ["ETH", "Ethereum", "ETH", 18],
  ["EURe", "Monerium EURe", "EURe", 18],
];

export const wellKnownTransitions: [
  crypto_id: string | null,
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

export class DefaultCryptoDB extends CryptoDB {
  constructor() {
    super();
    for (const [id, name, symbol, decimal] of wellKnownCryptos) {
      this.set(id, new CryptoAsset(id, name, symbol, decimal));
    }
  }
}

export type CryptoLike = Pick<CryptoAsset, "symbol">;

type MappingEntry<T extends CryptoLike> = {
  crypto: T | null;
  chain: string;
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

export class DefaultCryptoResolver extends CryptoResolver {
  private transitionMap: Map<ChainAddress, MappingEntry<CryptoAsset>[]>;
  private seq: number;

  constructor() {
    super();
    this.transitionMap = new Map();
    this.seq = 0;

    const cryptos: Map<string, CryptoAsset> = new Map();
    for (const [id, name, symbol, decimal] of wellKnownCryptos) {
      cryptos.set(id, new CryptoAsset(id, name, symbol, decimal));
    }
    for (const [
      crypto_id,
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
        crypto: crypto_id ? cryptos.get(crypto_id) || null : null,
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
  ): CryptoAsset | null {
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
        return transition.crypto;
      }
    }
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
    this.transitionMap.set(chainAddress, [
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
}
