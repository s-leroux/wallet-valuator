import { Explorer } from "./services/explorer.mjs";

/**
 *  The swarm act as a repository that maps (chain, address) to Address objects.
 */
export class Swarm {
  readonly map: Map<string, object>;
  readonly explorers: Map<string, Explorer>;

  constructor(explorers: Explorer[]) {
    this.map = new Map();
    this.explorers = new Map();
    for (const explorer of explorers) {
      this.explorers.set(explorer.chain, explorer);
      explorer.register(this);
    }
  }

  address(chain: string, address: string, data: object = {}) {
    const explorer = this.explorers.get(chain);
    if (!explorer) {
      throw new Error(`I can't explore The ${chain} chain`);
    }
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
