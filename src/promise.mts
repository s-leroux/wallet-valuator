declare global {
  interface PromiseConstructor {
    timeout: (delay: number) => Promise<void>;
  }
}

const ExtendedPromise = Promise;

ExtendedPromise.timeout = function (delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
};

export { ExtendedPromise as Promise };
