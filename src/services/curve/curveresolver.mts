import { CryptoAsset } from "../../cryptoasset.mjs";
import { CryptoResolver, ResolutionResult } from "../cryptoresolver.mjs";
import type { CryptoRegistryNG } from "../../cryptoregistry.mjs";
import { type CurveAPI, DefaultCurveAPI } from "./curveapi.mjs";
import type { Blockchain } from "../../blockchain.mjs";
import type { Swarm } from "../../swarm.mjs";
import { ChainAddress } from "../../chainaddress.mjs";
import { CurveMetadata } from "./curvecommon.mjs";
import { logger } from "../../debug.mjs";
import { CryptoMetadata } from "../../cryptoregistry.mjs";

const log = logger("curve-resolver");

export type CryptoLike = Pick<CryptoAsset, "symbol">;

type Entry = {
  crypto?: CryptoAsset; // cached crypto-asset
  poolAddress?: string;
};

export class CurveResolver extends CryptoResolver {
  readonly tokens: Map<ChainAddress, Entry>;

  constructor(readonly api: CurveAPI) {
    super();
    this.tokens = new Map();
  }

  static create(api?: CurveAPI) {
    return new CurveResolver(api ?? DefaultCurveAPI.create());
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async load() {
    const tokens = this.tokens;
    /*
    // ISSUE #104:

    Prepopulation strategie is flawed!

    if (tokens.size === 0) {
      // We assume we haven't loaded the tokens yet
      for (const chain of (await this.api.getChains()).data) {
        // Below:
        // It is not obvious that `getAllUSDPrices` returns all the tokens for a chain
        for (const token of (await this.api.getAllUSDPrices(chain.name)).data) {
          const entry = {};
          tokens.set(ChainAddress(chain.name, token.address), entry);
        }
      }
    }
  */
    return tokens;
  }

  async findLiquidityPool(
    chain: Blockchain,
    smartContractAddress: string
  ): Promise<Entry | null> {
    const chainName = chain.name.toLowerCase();
    const poolAddress = await this.api.getLiquidityPoolFromToken(
      chainName,
      smartContractAddress
    );
    if (!poolAddress) {
      log.info(
        "C1016",
        `${chainName} ${smartContractAddress} does not seem a Curve pool`
      );
      return null;
    }
    const entry = {
      poolAddress,
    };

    this.tokens.set(ChainAddress(chainName, smartContractAddress), entry); // cache the search result
    return entry;
  }

  async resolve(
    swarm: Swarm,
    cryptoMetadata: CryptoMetadata,
    chain: Blockchain,
    block: number,
    smartContractAddress: string,
    name: string,
    symbol: string,
    decimal: number
  ): Promise<ResolutionResult> {
    // **Maybe** it is one of our tokens
    const tokens = await this.load();

    const chainAddress = ChainAddress(chain.name, smartContractAddress);
    const entry =
      tokens.get(chainAddress) ??
      (await this.findLiquidityPool(chain, smartContractAddress));
    if (!entry) {
      // Not our business
      return null;
    }

    function cryptoAsset(
      cryptoRegistry: CryptoRegistryNG,
      cryptoMetadata: CryptoMetadata,
      entry: Entry
    ): CryptoAsset {
      let crypto = entry.crypto;
      if (crypto) {
        // ISSUE #65 assert the decimal are consistent with what we alreaady know. This is the only critical field
        // Other "user-supplied" fields are replaced by API values.
        return crypto;
      }

      crypto = entry.crypto = cryptoRegistry.createCryptoAsset(
        chainAddress,
        name,
        symbol,
        decimal
      );

      // Record domain specific metadata
      cryptoMetadata.setMetadata(crypto, {
        resolver: "curve",
        chain: chain.name.toLowerCase(),
        address: smartContractAddress.toLowerCase(),
        poolAddress: entry.poolAddress?.toLowerCase(),
      } as CurveMetadata);

      return crypto;
    }

    return {
      status: "resolved",
      asset: cryptoAsset(swarm.cryptoRegistry, cryptoMetadata, entry),
    };
  }
}
