import { assert } from "chai";

import { Command } from "commander";

describe("commander", function () {
  it("works", async function () {
    const argv = "parser  --test".split(/\s+/);
    const program = new Command();
    program.option("-t, --test");
    program.parse(argv, { from: "user" });

    const options = program.opts();
    assert.isTrue(options.test);
  });
});
