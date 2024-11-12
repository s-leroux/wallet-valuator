import { assert } from "chai";

import Database from "better-sqlite3";

const SQL_TEST = `
CREATE TABLE T (x TEXT);
INSERT INTO T(x) VALUES (1), (2), (3);
`;

describe("better-sqlite3", function () {
  it("works", async function () {
    const db = new Database(":memory:");

    db.exec(SQL_TEST);

    const stmt = db.prepare("SELECT COUNT(*) AS C, SUM(x) AS S FROM T");

    assert.deepEqual(stmt.get(), { C: 3, S: 6 });
  });
});
