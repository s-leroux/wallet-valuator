export interface Oracle {
  getPrice(id: string, date: Date, currencies: string[]);
}

export function mangle(platform, contract) {
  return `${platform}/${contract.toLowerCase()}`;
}
