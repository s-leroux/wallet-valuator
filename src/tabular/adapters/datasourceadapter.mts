import { Fixed } from "../../bignumber.mjs";
import { CSVFile, DataSource } from "../../csvfile.mjs";
import { TabularAdapter } from "../adapter.mjs";

export class DataSourceTabularAdapter implements TabularAdapter {
  constructor(readonly dataSource: DataSource<Date, Fixed>) {}

  headings(): readonly string[] {
    const { headings } = this.dataSource as CSVFile<Date, Fixed>;
    const ordered = Object.entries(headings)
      .filter((entry): entry is [string, number] => entry[1] !== undefined)
      .sort((a, b) => a[1] - b[1]);
    const [, ...rest] = ordered;
    return rest.map(([name]) => name);
  }

  *rows(): Generator<readonly [Date, ...Fixed[]]> {
    for (const row of this.dataSource) {
      yield row;
    }
  }
}
