import { DisplayOptions } from "../displayable.mjs";

export type ColumnSpec = Readonly<DisplayOptions> & { name: string };

export interface TabularView {
  /**
   * Returns an iterator over the lines of the formatted tabular data.
   *
   * @param columnSpecs
   *   The column name and display options to use for formatting.
   */
  lines(columnSpecs: readonly ColumnSpec[]): IterableIterator<string>;
}
