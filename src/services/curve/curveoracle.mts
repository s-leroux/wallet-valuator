import type { CryptoAsset } from "../../cryptoasset.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";
import type { Price } from "../../price.mjs";

import { Oracle } from "../oracle.mjs";
import { CurveAPI, DefaultCurveAPI } from "./curveapi.mjs";
import { CurveMetadata } from "./curvecommon.mjs";
import { FiatConverter } from "../fiatconverter.mjs";
import { BigNumberSource } from "../../bignumber.mjs";
import { GlobalMetadataRegistry } from "../../metadata.mjs";

const USD = FiatCurrency("USD");

export class CurveOracle extends Oracle {
  private constructor(readonly api: CurveAPI) {
    super();
  }

  async getPrice(
    registry: CryptoRegistry,
    crypto: CryptoAsset,
    date: Date,
    fiats: FiatCurrency[],
    fiatConverter: FiatConverter
  ): Promise<Record<FiatCurrency, Price>> {
    const result = {} as Record<FiatCurrency, Price>;
    const metadata = registry.getNamespaceData(
      crypto,
      "CURVE"
    ) as CurveMetadata;

    if (!metadata) {
      // We do not handle that crypto
      return result;
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
    } else {
      const priceAsUSD = await this.api.getUSDPrice(
        metadata.chain,
        metadata.address,
        date
      );

      priceAsNumber = priceAsUSD.data[0].price;
    }
    const price = GlobalMetadataRegistry.setMetadata(
      crypto.price(USD, priceAsNumber),
      { origin: "CURVE" }
    );
    result[USD] = price;
    /*
    for (const fiat of fiats) {
      if (fiat !== USD) {
        result[fiat] = await fiatConverter.convert(registry, date, price, fiat);
      }
    }
      */
    return result;
  }

  static create(api?: CurveAPI) {
    return new CurveOracle(api ?? DefaultCurveAPI.create());
  }
}
export { CurveMetadata };
