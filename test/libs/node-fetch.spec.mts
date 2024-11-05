import { assert } from "chai";

import fetch from "node-fetch";

const HTTPBIN_BASE_ADDR = "https://httpbingo.org/";

describe("node-fetch", function () {
  const TIMEOUT = 5000;
  this.timeout(TIMEOUT);
  this.slow(TIMEOUT / 2);

  it("works", async function () {
    const message = "a=1";
    const response = await fetch(`${HTTPBIN_BASE_ADDR}post`, {
      method: "POST",
      body: "a=1",
    });
    const json: any = await response.json();

    assert.equal(response.status, 200);
    assert.equal(message, json.data);
  });
});
