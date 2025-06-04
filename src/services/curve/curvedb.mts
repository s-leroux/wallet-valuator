// cat fixtures/Curve/api/getPools/all/*.json | jq --slurp -f allPool.jq
// [ .[] | .data.poolData | .[] | { chain: .blockchainId, name, symbol, poolAddress: .address, lpTokenAddress, gaugeAddress }]
import DB from "./curvedb.json" with { type: "json" };

/**
 * Interface to the hard-coded snapshot of the Curve pools database.
 * The goal is to use this DB as a complement (or in some cases replacement) for
 * querying the API until (a) the `/v1/usd_price/{chain}/{address}` endpoint is fixed
 * (see https://discord.com/channels/729808684359876718/729812922649542758/1356644816494133500)
 * or (b) we find another route to query the Curve API (maybe investigating api.curve.finance
 * as a complement to prices.curve.finance)
 */
export function findLiquidityPool(chainName: string, address: string) {
  address = address.toLowerCase();
  chainName = chainName.toLowerCase();
  for (const item of DB) {
    if (item.chain.toLowerCase() === chainName) {
      if (
        item.lpTokenAddress.toLowerCase() === address ||
        item.gaugeAddress?.toLowerCase() === address
      ) {
        return item.poolAddress.toLowerCase();
      }
    }
  }
  return null;
}
