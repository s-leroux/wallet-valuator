/**
 * TabularAdapter is an interface for a tabular data source.
 */
export interface TabularAdapter {
  headings(): readonly string[];
  rows(): Iterable<readonly unknown[]>;
}
