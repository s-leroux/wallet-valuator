import { DisplayOptions } from "../displayable.mjs";

export type ColumnSpec = DisplayOptions & { name: string };

export interface TabularAdapter {
  headings(): readonly ColumnSpec[];
  rows(): IterableIterator<readonly unknown[]>;
}
