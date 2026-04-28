import assert from "assert";
import { Fixed } from "../../../src/bignumber.mjs";
import { CSVFile, DataSource } from "../../../src/datasource.mjs";
import { DataSourceTabularAdapter } from "../../../src/tabular/adapters/datasourceadapter.mjs";

describe("DataSourceTabularAdapter", () => {
  const CSV_TEST_FILE = "fixtures/usdc-usd-max.csv";
  let dataSource: DataSource<Date, Fixed>;

  beforeEach(async () => {
    dataSource = await CSVFile.createFromPath(
      CSV_TEST_FILE,
      (date) => new Date(date),
      (value) => Fixed.fromString(value),
    );
  });

  it("should retrieve the headings from the data source", () => {
    const adapter = new DataSourceTabularAdapter(dataSource);
    assert.deepEqual(adapter.headings(), [
      "Open",
      "High",
      "Low",
      "Close",
      "Adj Close",
      "Volume",
    ]);
  });

  it("should expose the rows from the data source", () => {
    const adapter = new DataSourceTabularAdapter(dataSource);

    const f = (s: string) => Fixed.fromString(s);

    // prettier-ignore
    const expected = [
      [new Date("2026-04-04"), f("0.999934"), f("1.000004"), f("0.999572"), f("0.99975"), f("0.99975"), f("4282322176")],
      [new Date("2026-04-03"), f("0.999894"), f("1.000221"), f("0.999378"), f("0.99992"), f("0.99992"), f("5591343047")],
      [new Date("2026-04-02"), f("0.999878"), f("1.000297"), f("0.999428"), f("0.999919"), f("0.999919"), f("10841918199")],
      [new Date("2026-04-01"), f("0.999664"), f("1.000423"), f("0.998799"), f("0.999888"), f("0.999888"), f("12419162767")],
      [new Date("2026-03-31"), f("0.999701"), f("1.000165"), f("0.999136"), f("0.999674"), f("0.999674"), f("11937610059")],
      [new Date("2026-03-30"), f("0.999989"), f("1.000646"), f("0.999303"), f("0.999692"), f("0.999692"), f("10412150498")],
      [new Date("2026-03-29"), f("0.999725"), f("1.000532"), f("0.999308"), f("0.999988"), f("0.999988"), f("4928797586")],
      [new Date("2026-03-28"), f("1.000004"), f("1.000389"), f("0.999457"), f("0.999725"), f("0.999725"), f("4638803608")],
      [new Date("2026-03-27"), f("0.999847"), f("1.000415"), f("0.999348"), f("0.999944"), f("0.999944"), f("11188014890")],
      [new Date("2026-03-26"), f("0.999854"), f("1.000479"), f("0.999313"), f("1.000085"), f("1.000085"), f("10473912782")],
    ];

    const actual = Array.from(adapter.rows()).slice(0, 10);

    assert.deepEqual(actual, expected);
  });

  it("should expose all the rows from the data source", () => {
    const adapter = new DataSourceTabularAdapter(dataSource);

    assert.equal(Array.from(adapter.rows()).length, 2736);
  });
});
