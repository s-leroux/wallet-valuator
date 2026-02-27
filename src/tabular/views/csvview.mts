import { DisplayOptions, toDisplayString } from "../../displayable.mjs";
import { TabularAdapter } from "../adapter.mjs";

export type ColumnSpec = Readonly<DisplayOptions> & { name: string };

/**
 * CSVView is a view that formats a tabular data source as a CSV string.
 *
 * @param tabularDataSource - The tabular data source to format.
 */
export class CSVTabularView {
  constructor(
    readonly tabularDataSource: TabularAdapter,
    readonly separator: string = ",",
  ) {}

  /**
   * Returns the CSV string of the formatted tabular data.
   *
   * @param columnSpecs
   *   The column name and display options to use for formatting.
   */
  *lines(columnSpecs: readonly ColumnSpec[]): IterableIterator<string> {
    const headings = this.tabularDataSource.headings();

    // Find the index of each column in the headings.
    // We use that as an indirection table to map column specs to the requested headings.
    const indexOf = columnSpecs.map((columnSpec) =>
      headings.indexOf(columnSpec.name),
    );

    // Build the lines by concatenating the cells with the appropriate separator.
    for (const row of this.tabularDataSource.rows()) {
      yield indexOf
        .map((ptr) => toDisplayString(row[ptr], columnSpecs[ptr]))
        .join(this.separator);
    }
  }
}
