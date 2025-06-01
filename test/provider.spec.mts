import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;
import {
  JSONAtom,
  Payload,
  Provider,
  type ProviderOptionBag,
} from "../src/provider.mjs";

const MOCHA_TEST_TIMEOUT = 2000;
const FAKE_API_KEY = "12345";

const HTTPBIN_BASE_ADDR = "https://httpbingo.org/";

// Type for httpbingo.org response
type HttpBinResponse = {
  method: string;
  args: Record<string, JSONAtom>;
  headers: Record<string, string>;
  origin: string;
  url: string;
};

class TestProvider extends Provider {
  forced_failures: number;

  constructor(options: ProviderOptionBag = {}) {
    super(HTTPBIN_BASE_ADDR, options);
    this.forced_failures = 0;
  }

  injectExtraParams(search_params: URLSearchParams) {
    search_params.set("apiKey", FAKE_API_KEY);
  }

  isError(res: Response, payload: Payload) {
    if (this.forced_failures > 0) {
      return true;
    }
    return super.isError(res, payload);
  }

  shouldRetry(res: Response, payload: Payload) {
    if (this.forced_failures-- > 0) return true;
    const status = res.status;

    return status === 429 || status >= 500;
  }

  newError(res: Response, payload: Payload) {
    // OVERRIDE ME
    return new Error(`Request returned status code ${res.status}`);
  }
}

describe("Provider", function () {
  this.timeout(MOCHA_TEST_TIMEOUT);
  this.slow(MOCHA_TEST_TIMEOUT);

  it("fetch data", async function () {
    const provider = new TestProvider();
    const payload = (await provider.fetch("get", {})) as HttpBinResponse;

    assert.isObject(payload);
    assert.equal(payload.method, "GET");
  });

  it("inject the API key", async function () {
    const provider = new TestProvider();
    const payload = (await provider.fetch("get", {})) as HttpBinResponse;

    assert.isObject(payload);
    assert.equal(payload.args.apiKey, FAKE_API_KEY);
  });

  it("retry the query in case of failure (3 × W:C2002 expected)", async function () {
    const RETRIES = 3;
    this.timeout(RETRIES * MOCHA_TEST_TIMEOUT);
    this.slow((RETRIES * MOCHA_TEST_TIMEOUT) / 2);

    const provider = new TestProvider();
    provider.forced_failures = RETRIES;
    const payload = (await provider.fetch("get", {
      x: "26",
    })) as HttpBinResponse;

    assert.isObject(payload);
    assert.equal(payload.args.x, 26);
    assert.equal(provider.retries, RETRIES);
  });

  it("fail on status error (W:C2002 expected)", async function () {
    const provider = new TestProvider();
    return assert.isRejected(
      provider.fetch("status/418", {}),
      "status code 418"
    );
  });
});
