import { toDisplayString } from "../../displayable.mjs";
import { TabularAdapter } from "../adapter.mjs";
import { ColumnSpec, TabularView } from "../view.mjs";

/**
 * PrettyTabularView is a view that formats a tabular data source as a list of lines.
 *
 * @param tabularDataSource - The tabular data source to format.
 */
export class PrettyTabularView implements TabularView {
  constructor(readonly tabularDataSource: TabularAdapter) {}

  /**
   * Returns an iterator over the lines of the formatted tabular data.
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
    const width = indexOf.map(() => 0);
    const columns = indexOf.map(() => [] as string[]);

    // Build the columns and compute the width of each column.
    for (const row of this.tabularDataSource.rows()) {
      indexOf.forEach((ptr, i) => {
        const columnSpec = columnSpecs[ptr];
        const cell = toDisplayString(row[ptr], columnSpec);
        const length = cell.length;
        columns[i].push(cell);
        if (length > width[i]) width[i] = length;
      });
    }

    // Build the lines by concatenating the columns with the appropriate padding.
    for (let i = 0; i < columns[0].length; ++i) {
      yield columns
        .map((col, index) => col[i].padStart(width[index]))
        .join("|");
    }
  }
}
