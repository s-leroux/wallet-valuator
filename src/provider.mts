import { Promise } from "./promise.mjs";
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

  /**
   * Determines whether the given response and payload indicate an error.
   * Subclasses should override to implement provider-specific error detection logic.
   *
   * @param res - The HTTP Response object.
   * @param payload - The response payload (e.g., parsed JSON or text).
   * @returns True if the response represents an error condition; false otherwise.
   */
  isError(res: any, payload: Payload) {
    // OVERRIDE ME
    return res.status != 200;
  }

  /**
   * Determines whether the request should be retried based on the response and payload.
   * Subclasses can override this method to refine retry logic.
   *
   * @param res - The HTTP Response object (may be undefined in case of low-level errors).
   * @param payload - The response payload or error object.
   * @returns True if the request should be retried; false otherwise.
   */
  shouldRetry(res: any, payload: Payload) {
    // OVERRIDE ME
    if (!res) return true; // internal error: we assume it was a transient issue

    const status = res.status;
    return status === 429 || status >= 500;
  }

  /**
   * Constructs a new Error instance for a failed request.
   * Subclasses should override this method to provide custom error types and messages.
   *
   * @param res - The HTTP Response object.
   * @param payload - The response payload or error details.
   * @returns An Error instance representing the failure.
   */
  newError(res: any, payload: Payload) {
    // OVERRIDE ME
    return new Error( // ISSUE 29 We should have a specific HTTPStatusError
      `Error status ${res.status} while fetching ${res.url}\n${payload}`
    );
  }

  /**
   * Builds a complete URL for an API endpoint by merging the base URL,
   * endpoint, and query parameters.  It also allows extra parameters to be
   * injected.
   *
   * @param endpoint - The endpoint path relative to the base URL.
   * @param params - An object containing query parameters.
   * @returns A URL object representing the full URL.
   */
  buildUrl(endpoint: string, params: Record<string, any>): URL {
    const url = new URL(endpoint, this.base);
    const search_params = new URLSearchParams(params);
    this.injectExtraParams(search_params);

    url.search = search_params.toString();

    return url;
  }

  /**
   * Executes a fetch request to the given URL using the semaphore for concurrency control.
   * It performs response reading (JSON or text) and normalizes errors by calling isError.
   * The try–catch only covers the native fetch and response parsing, so that exceptions from
   * user code in isError() are not inadvertently caught.
   *
   * @param url - The URL to fetch.
   * @returns An object containing the Response (if available), the payload, and an is_error flag.
   */
  private async performFetch(url: URL) {
    let res;
    let payload;
    try {
      res = await this.semaphore.do(fetch, url);
      payload = await (is_json(res) ? res.json() : res.text());
    } catch (err) {
      return { result: err, is_error: true };
    }

    // Call this.isError outside the try block so that exceptions from user code are not swallowed
    return { res, payload, is_error: this.isError(res, payload) };
  }

  /**
   * Fetches a resource from the given endpoint with the provided parameters.
   * This method implements a retry loop with exponential backoff if the request fails
   * due to either network issues or response errors as determined by isError.
   *
   * @param endpoint - The API endpoint to fetch.
   * @param params - An optional object containing query parameters.
   * @returns The response payload (either parsed JSON or text) if the fetch is successful.
   * @throws An error if the maximum number of retries is exceeded or if a non-retryable error occurs.
   */
  async fetch(endpoint: string, params: Record<string, any> = {}) {
    let { cooldown, retry } = this.options;
    const url = this.buildUrl(endpoint, params);

    while (true) {
      const { res, payload, is_error } = await this.performFetch(url);

      if (is_error) {
        // it's an error
        if (retry-- > 0 && this.shouldRetry(res, payload)) {
          await Promise.timeout(cooldown);
          cooldown *= 1.4 + 0.2 * Math.random();

          ++this.retries; // for stats

          const message = res
            ? `${res.status} ${res.statusText}`
            : String(payload);
          log.info("C1001", `${url} retrying ${retry} (${message})`);
          continue;
        }

        log.warn("C2002", `Failed to download ${url}`);
        throw this.newError(res, payload);
      }

      return payload;
    }
  }
}
