import type { CryptoAsset } from "../../cryptoasset.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoRegistryNG } from "../../cryptoregistry.mjs";

import { Oracle } from "../oracle.mjs";
import { CurveAPI, DefaultCurveAPI } from "./curveapi.mjs";
import { CurveMetadata } from "./curvecommon.mjs";
import { GlobalPriceMetadata } from "../../price.mjs";
import type { PriceMap } from "../oracle.mjs";
import type { CryptoMetadata } from "../../cryptoregistry.mjs";
import { logger } from "../../debug.mjs";
import {
  baseConfidenceForOrigin,
  DEFAULT_BASE_CONFIDENCE,
} from "../../priceconfidence.mjs";

const log = logger("curveoracle");

const USD = FiatCurrency("USD");

export class CurveOracle extends Oracle {
  private constructor(readonly api: CurveAPI) {
    super();
  }

  async getPrice(
    cryptoRegistry: CryptoRegistryNG,
    cryptoMetadata: CryptoMetadata,
    cryptoAsset: CryptoAsset,
    date: Date,
    fiats: Set<FiatCurrency>,
    result: PriceMap
  ): Promise<void> {
    const metadata = cryptoMetadata.getMetadata<CurveMetadata>(cryptoAsset);

    if (!metadata || metadata.resolver !== "curve") {
      // We do not handle that crypto
      return;
    }

    if (!metadata.chain) {
      log.warn("C2006", "Inconsistent metadata", metadata);
      return;
    }

    // We have two path to find the USD price of a token on Curve.
    // 1. some prices are available by token address using `getUSDPrice`
    // 2. some prices are NOT available from their and requires querying
    // the pool's price.
    // see https://discord.com/channels/729808684359876718/729812922649542758/1356633193381625961
    let priceAsNumber: number;
    if (metadata.poolAddress) {
      const OHLC = await this.api.getLiquidityPoolOHLC(
        metadata.chain,
        metadata.poolAddress,
        date
      );
      const { open, high, low, close } = OHLC.data[0];
      priceAsNumber = (open + high + low + close) / 4.0;
    } else if (metadata.address) {
      const priceAsUSD = await this.api.getUSDPrice(
        metadata.chain,
        metadata.address,
        date
      );
      const priceData = priceAsUSD.data;

      // Validate priceData for corner cases
      if (!priceData || priceData.length === 0) {
        log.trace(
          "C1019",
          `No price data available for ${cryptoAsset} at ${date}`
        );
        return;
      } else if (priceData.length > 1) {
        log.warn(
          "C2008",
          `Multiple price entries found for ${cryptoAsset} at ${date}, using first entry`,
          priceData
        );
      }
      priceAsNumber = priceAsUSD.data[0].price;
    } else {
      log.warn("C2007", "Inconsistent metadata", metadata);
      return;
    }

    const price = GlobalPriceMetadata.setMetadata(
      cryptoAsset.price(USD, priceAsNumber),
      {
        origin: "CURVE",
        confidence:
          baseConfidenceForOrigin("CURVE") ?? DEFAULT_BASE_CONFIDENCE,
      }
    );
    result.set(USD, price);
  }

  static create(api?: CurveAPI) {
    return new CurveOracle(api ?? DefaultCurveAPI.create());
  }
}
export { CurveMetadata };
