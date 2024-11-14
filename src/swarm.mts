/**
 *  The swarm act as a repository that maps (chain, address) to Address objects.
 */
export class Swarm {
  readonly map: Map<string, object>;

  constructor() {
    this.map = new Map();
  }

  find(chain: string, address: string, data: object = {}) {
    address = address.toLowerCase(); // XXX We do not handle mixed-case addresses properly

    const key = `${chain}:${address}`;

    let obj = this.map.get(key);
    if (obj === undefined) {
      obj = { __id: key, __chain: chain, __address: address };
      this.map.set(key, obj);
    }

    Object.assign(obj, data);

    return obj;
  }
}
