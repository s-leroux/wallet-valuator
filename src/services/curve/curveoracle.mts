import type { CryptoAsset } from "../../cryptoasset.mjs";
import { FiatCurrency } from "../../fiatcurrency.mjs";
import type { CryptoRegistry } from "../../cryptoregistry.mjs";
import type { Price } from "../../price.mjs";

import { Oracle } from "../oracle.mjs";
import { CurveAPI } from "./curveapi.mjs";
import { CurveMetadata } from "./curvecommon.mjs";
import { FiatConverter } from "../fiatconverter.mjs";

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

    const priceAsUSD = await this.api.getUSDPrice(
      metadata.chain,
      metadata.address,
      date
    );

    const priceAsNumber = priceAsUSD.data[0].price;
    const price = crypto.price(USD, priceAsNumber);
    result[USD] = price;

    for (const fiat of fiats) {
      if (fiat !== USD) {
        result[fiat] = await fiatConverter.convert(registry, date, price, fiat);
      }
    }
    return result;
  }

  static create(api: CurveAPI) {
    return new CurveOracle(api);
  }
}
export { CurveMetadata };
