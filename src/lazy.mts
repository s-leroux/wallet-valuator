/**
 *  Create a lazy instance of a class
 */
export function lazy<T extends object, U>(
  ctor: new (..._: U[]) => T,
  ...args: U[]
): T {
  let backend = null;
  return new Proxy({} as T, {
    get(target, prop, receiver) {
      if (!backend) {
        backend = new ctor(...args);
      }
      const item = backend[prop];

      // backend's internal calls do not need to go through the proxy
      if (typeof item !== "function") return item;
      return function (...args) {
        return item.call(backend, ...args);
      };
    },
  });
}
