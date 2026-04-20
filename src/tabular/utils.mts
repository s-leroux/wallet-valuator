import type { TabularAdapter } from "./adapter.mjs";
import type { ColumnSpec } from "./view.mjs";
import { CSVTabularView } from "./views/csvview.mjs";

type Lines = Iterable<string>;

export function asCSV<T, A extends TabularAdapter>(
  dataSource: T,
  adapterCtor: new (dataSource: T) => A,
  ...columnSpecs: ColumnSpec[]
): Lines {
  const adapter = new adapterCtor(dataSource);
  const view = new CSVTabularView(adapter);
  return view.lines(columnSpecs);
}
