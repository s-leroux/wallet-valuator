import { assert } from "chai";

import { prepare } from "../../support/register.helper.mjs";

import { CryptoResolver } from "../../../src/services/cryptoresolver.mjs";
import { CurveResolver } from "../../../src/services/curve/curveresolver.mjs";
import {
  CryptoMetadata,
  CryptoRegistryNG,
} from "../../../src/cryptoregistry.mjs";
import { isCryptoAsset } from "../../../src/cryptoasset.mjs";

// Test data
import { FakeCurveAPI } from "../../support/curveapi.fake.mjs";
import { asBlockchain } from "../../../src/blockchain.mjs";
import { Swarm } from "../../../src/swarm.mjs";
import { CurveMetadata } from "../../../src/services/curve/curvecommon.mjs";

const E = asBlockchain("ethereum");
const G = asBlockchain("gnosis");

// prettier-ignore
const TEST_SET = [
  [E, "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", "3pool"],
  [E, "0x383E6b4437b59fff47B619CBA855CA29342A8559", "PayPool"],
  [G, "0x1337BedC9D22ecbe766dF105c9623922A27963EC", "3pool"],
] as const;

describe("CurveResolver", function () {
  let resolver: CryptoResolver;
  let cryptoRegistry: CryptoRegistryNG;
  let cryptoMetadata: CryptoMetadata;
  let swarm: Swarm;

  beforeEach(() => {
    resolver = new CurveResolver(FakeCurveAPI.create());
    cryptoRegistry = CryptoRegistryNG.create();
    cryptoMetadata = CryptoMetadata.create();
    swarm = Swarm.create([], cryptoRegistry, cryptoMetadata, resolver);
  });

  describe("resolve()", function () {
    describe("should resolve a chain and smart-contract to a logical token:", function () {
      const register = prepare(this);

      for (const [chain, contract, name] of TEST_SET) {
        register(`case ${chain} ${name}`, async () => {
          const result = await resolver.resolve(
            swarm,
            cryptoMetadata,
            chain,
            0,
            contract,
            name,
            name,
            18
          );

          if (!result || result.status !== "resolved") {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            assert.fail(`result was ${result}`);
          }
          assert(isCryptoAsset(result.asset));
        });
      }
    });

    describe("should populate the crypto registry metadata", function () {
      const register = prepare(this);

      for (const [chain, contract, name] of TEST_SET) {
        register(`case ${chain} ${name}`, async () => {
          const result = await resolver.resolve(
            swarm,
            cryptoMetadata,
            chain,
            0,
            contract,
            name,
            name,
            18
          );

          if (!result || result.status !== "resolved")
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            assert.fail(`result was ${result}`);
          const metadata = cryptoMetadata.getMetadata<CurveMetadata>(
            result.asset
          );
          assert.isDefined(metadata);
          assert.equal(metadata.chain, chain.name.toLowerCase());
          assert.equal(metadata.address, contract.toLowerCase());
        });
      }
    });
  });
});
