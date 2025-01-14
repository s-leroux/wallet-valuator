import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;
import { Provider } from "../src/provider.mjs";

const MOCHA_TEST_TIMEOUT = 2000;
const HTTPBIN_BASE_ADDR = "https://httpbingo.org/";
const FAKE_API_KEY = "12345";

export type Payload = Record<string, any> | string;

class TestProvider extends Provider {
  forced_failures: number;

  constructor(options: any = {}) {
    super(HTTPBIN_BASE_ADDR, options);
    this.forced_failures = 0;
  }

  injectExtraParams(search_params: Record<string, any>) {
    // OVERRIDE ME
    search_params.set("apiKey", FAKE_API_KEY);
  }

  isError(res: any, payload: Payload) {
    if (this.forced_failures > 0) {
      return true;
    }
    return res.status != 200; // XXX ISSUE #35 Should be the default implementation!
  }

  shouldRetry(res: any, payload: Payload) {
    // OVERRIDE ME
    if (this.forced_failures-- > 0) return true;
    const status = res.status;

    return status === 429 || status >= 500;
  }

  newError(res: any, payload: Payload) {
    // OVERRIDE ME
    return new Error(`Request returned status code ${res.status}`);
  }
}

describe("Provider", function () {
  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT);

  it("fetch data", async function () {
    const provider = new TestProvider();
    const json = await provider.fetch("get", {});

    assert.equal(json.method, "GET");
  });

  it("inject the API key", async function () {
    const provider = new TestProvider();
    const json = await provider.fetch("get", {});

    assert.equal(json.args.apiKey, FAKE_API_KEY);
  });

  it("retry the query in case of failure", async function () {
    const RETRIES = 3;
    this.timeout(RETRIES * MOCHA_TEST_TIMEOUT);
    this.slow((RETRIES * MOCHA_TEST_TIMEOUT) / 2);

    const provider = new TestProvider();
    provider.forced_failures = RETRIES;
    const json = await provider.fetch("get", { x: 26 });

    assert.equal(json.args.x, 26);
    assert.equal(provider.retries, RETRIES);
  });

  it("fail on status error", async function () {
    const provider = new TestProvider({ parse_json: false });
    return assert.isRejected(
      provider.fetch("status/418", {}),
      "status code 418"
    );
  });
});
