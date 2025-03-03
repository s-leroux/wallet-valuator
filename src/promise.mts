type ExtendedPromise = typeof Promise & {
  timeout: (delay: number) => Promise<void>;
};

const ExtendedPromise = Promise as ExtendedPromise;

ExtendedPromise.timeout = function (delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
};

export { ExtendedPromise as Promise };
