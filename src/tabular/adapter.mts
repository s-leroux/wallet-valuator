import { DisplayOptions } from "../displayable.mjs";

export type ColumnSpec = DisplayOptions & { name: string };

export interface TabularAdapter {
  columns(): ColumnSpec[];
  rows(): IterableIterator<unknown[]>;
}
