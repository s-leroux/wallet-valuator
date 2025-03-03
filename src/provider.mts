import { Semaphore } from "./semaphore.mjs";
import { logger as logger } from "./debug.mjs";

const log = logger("provider");

export interface ProviderInterface {
  fetch(endpoint: string, params: Record<string, string>): Promise<object>;
}

function is_json(res: any): boolean {
  const content_type = res.headers.get("content-type");
  if (content_type && content_type.indexOf("application/json") > -1) {
    return true;
  }

  return false;
}

const defaultOptions = {
  retry: 5, // How many time should we retry the request?
  cooldown: 100, // Initial time to wait (in ms) before a new attempt
  concurrency: Infinity, // How many concurrent request do we allow?
};

export type OptionBag = Partial<typeof defaultOptions>;

export type Payload = Record<string, any> | string;

export class Provider implements ProviderInterface {
  /**
   * Interface to the webservice provider.
   */
  readonly base: string;
  readonly options: Required<OptionBag>;
  readonly semaphore: Semaphore;

  // statistics
  retries: number; // How many time did we retry a request

  constructor(base: string, options: OptionBag = {}) {
    // FIXED #67 Create a type for the option bag
    this.base = base;
    this.options = Object.assign(Object.create(null), defaultOptions, options);

    this.semaphore = new Semaphore(this.options.concurrency);
    this.retries = 0;
  }

  injectExtraParams(search_params: URLSearchParams) {
    // OVERRIDE ME
  }

  isError(res: any, payload: Payload) {
    // OVERRIDE ME
    return res.status != 200;
  }

  shouldRetry(res: any, payload: Payload) {
    // OVERRIDE ME
    const status = res.status;
    return status === 429 || status >= 500;
  }

  newError(res: any, payload: Payload) {
    // OVERRIDE ME
    return new Error( // ISSUE 29 We should have a specific HTTPStatusError
      `Error status ${res.status} while fetching ${res.url}\n${payload}`
    );
  }

  buildUrl(endpoint: string, params: Record<string, any>): URL {
    const url = new URL(endpoint, this.base);
    const search_params = new URLSearchParams(params);
    this.injectExtraParams(search_params);

    url.search = search_params.toString();

    return url;
  }

  async fetch(endpoint: string, params: Record<string, any> = {}) {
    let { cooldown, retry } = this.options;
    const url = this.buildUrl(endpoint, params);

    while (true) {
      const res = await this.semaphore.do(fetch, url);

      const result = await (is_json(res) ? res.json() : res.text());
      const is_error = this.isError(res, result);

      if (is_error) {
        // it's an error
        if (retry-- > 0 && this.shouldRetry(res, result)) {
          await new Promise((r) => setTimeout(r, cooldown));
          cooldown *= 1.4 + 0.2 * Math.random();

          ++this.retries; // for stats
          log.info(
            "C1001",
            `${url} retrying ${retry} (${res.status} ${res.statusText})`
          );
          continue;
        }

        console.dir(result);
        throw this.newError(res, result);
      }

      return result;
    }
  }
}
