export interface ProviderInterface {
  fetch(endpoint: string, params: Record<string, string>): Promise<object>;
}

const DEFAULT_RETRY = 5;
const DEFAULT_COOLDOWN = 100;

function is_json(res: any): boolean {
  const content_type = res.headers.get("content-type");
  if (content_type && content_type.indexOf("application/json") > -1) {
    return true;
  }

  return false;
}

export type Payload = Record<string, any> | string;

export class Provider implements ProviderInterface {
  /**
   * Interface to the webservice provider.
   */
  readonly base: string;
  readonly retry: number;
  readonly cooldown: number;

  // statistics
  retries: number; // How many time did we retry a request because or rate-limit

  constructor(base: string, options = {} as any) {
    // ISSUE #67 Create a type for the option bag
    this.base = base;
    this.retry = options.retry ?? DEFAULT_RETRY;
    this.cooldown = options.cooldown ?? DEFAULT_COOLDOWN;
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
    let cooldown = this.cooldown;
    let retry = this.retry;
    const url = this.buildUrl(endpoint, params);

    while (true) {
      const res = await fetch(url);

      const result = await (is_json(res) ? res.json() : res.text());
      const is_error = this.isError(res, result);

      if (is_error) {
        // it's an error
        if (retry-- > 0 && this.shouldRetry(res, result)) {
          await new Promise((r) => setTimeout(r, cooldown));
          cooldown *= 1.4 + 0.2 * Math.random();

          ++this.retries; // for stats
          console.log(
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
