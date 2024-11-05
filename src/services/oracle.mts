export interface Oracle {
  getPrice(
    platform: string,
    contract: string,
    baseCurrencySymbol: string,
    date: Date
  );
}

export function mangle(platform, contract) {
  return `${platform}/${contract.toLowerCase()}`;
}
