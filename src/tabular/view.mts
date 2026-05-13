import { DisplayOptions } from "../displayable.mjs";
import { ValueError } from "../error.mjs";
import { Logged } from "../errorutils.mjs";

export type ColumnSpec = Readonly<DisplayOptions> & { name: string };

/**
 * For each entry in {@link columnSpecs}, returns the index of that column’s
 * {@link ColumnSpec.name} in {@link headings} (first match, same as
 * `Array.prototype.indexOf`).
 *
 * @throws {@link ValueError} when any {@link ColumnSpec.name} is not present in
 *   {@link headings}.
 */
export function columnIndices(
  headings: readonly string[],
  columnSpecs: readonly Pick<ColumnSpec, "name">[],
): number[] {
  let missing: Set<string> | undefined;
  const indices = columnSpecs.map((columnSpec) => {
    const index = headings.indexOf(columnSpec.name);
    if (index === -1) {
      if (!missing) {
        missing = new Set<string>();
      }
      missing.add(columnSpec.name);
    }
    return index;
  });

  if (missing) {
    throw Logged(
      "C3116",
      ValueError,
      `Unknown tabular column name(s): ${[...missing].sort().join(", ")}.`,
    );
  }
  return indices;
}

export interface TabularView {
  /**
   * Returns an iterator over the lines of the formatted tabular data.
   *
   * @param columnSpecs
   *   The column name and display options to use for formatting.
   */
  lines(columnSpecs: readonly ColumnSpec[]): IterableIterator<string>;
}
