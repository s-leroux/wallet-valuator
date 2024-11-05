export interface Oracle {
  getPrice(quoteCurrencySymbol: string, baseCurrencySymbol: string, date: Date);
}
