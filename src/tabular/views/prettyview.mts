import { toDisplayString } from "../../displayable.mjs";
import { TabularAdapter } from "../adapter.mjs";

export class PrettyTabularView {
  constructor(readonly tabularDataSource: TabularAdapter) {}

  *lines(): IterableIterator<string> {
    const headings = this.tabularDataSource.headings();
    const width = headings.map(() => 0);
    const columns = headings.map(() => [] as string[]);

    for (const row of this.tabularDataSource.rows()) {
      headings.forEach((heading, index) => {
        const cell = toDisplayString(row[index], heading);
        const length = cell.length;

        columns[index].push(cell);
        if (length > width[index]) width[index] = length;
      });
    }

    for (let i = 0; i < columns[0].length; ++i) {
      yield columns
        .map((col, index) => col[i].padStart(width[index]))
        .join("|");
    }
  }
}
