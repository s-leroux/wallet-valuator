import { Explorer } from "./services/explorer.mjs";
import { Address } from "./address.mjs";

/**
 *  The swarm act as a repository that maps (chain, address) to Address objects.
 */
export class Swarm {
  readonly addresses: Map<string, Address>;
  readonly explorers: Map<string, Explorer>;

  constructor(explorers: Explorer[]) {
    this.addresses = new Map();
    this.explorers = new Map();
    for (const explorer of explorers) {
      this.explorers.set(explorer.chain, explorer);
      explorer.register(this);
    }
  }

  explorer(chain: string): Explorer {
    return this.explorers.get(chain);
  }

  address(chain: string, address: string, data: object = {}): Address {
    const explorer = this.explorers.get(chain);
    if (!explorer) {
      throw new Error(`I can't explore The ${chain} chain`);
    }
    address = address.toLowerCase(); // XXX We do not handle mixed-case addresses properly

    const key = `${chain}:${address}`;

    let obj: Address = this.addresses.get(key);
    if (!obj) {
      obj = new Address(this, chain, address);
      obj.__id = key; // XXX This is ugly
      this.addresses.set(key, obj);
    }

    Object.assign(obj.data, data);

    return obj;
  }
}
