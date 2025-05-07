import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert = chai.assert;

import { ValueError } from "../../../src/error.mjs";
import {
  RealTokenOracle,
  RealTokenUUID,
} from "../../../src/services/realtoken/realtokenoracle.mjs";
import { parseDate } from "../../../src/date.mjs";
import { FiatCurrency } from "../../../src/fiatcurrency.mjs";
import { CryptoRegistry } from "../../../src/cryptoregistry.mjs";

import { prepare } from "../../support/register.helper.mjs";

import { FakeRealTokenAPI } from "../../support/realtokenapi.fake.mjs";
import { BigNumber } from "../../../src/bignumber.mjs";

describe("RealTokenUUID", () => {
  it("can be created from string", () => {
    const uuid = RealTokenUUID("0x9528a7402C0Fe85B817aa6E106EAFa03A02924c4");
  });

  describe("behavior", function () {
    const addr = "0x9528a7402C0Fe85B817aa6E106EAFa03A02924c4"; // EIP-55 mixed case string
    const uuid = RealTokenUUID(addr);
    describe("are comparable-by-value primitive types", function () {
      const register = prepare(this);

      // prettier-ignore
      const testcases = [
      [uuid, uuid, true],
    ];
      for (const [a, b, expected] of testcases) {
        register(`case "${a}" "${b}"`, () => {
          // ISSUE #69 Check if this test should be asymmetric: === vs !=
          (expected ? assert.strictEqual : assert.notEqual)(a, b);
        });
      }
    });

    describe("is well-formed", () => {
      describe("should normalize uuid to lowercase", function () {
        const register = prepare(this);
        // prettier-ignore
        const testcases = [
        [addr],
        [addr.toLowerCase()],
        [addr.toUpperCase()],
      ];
        for (const [a] of testcases) {
          register(
            `case RealTokenUUID("${a}") === "${addr.toLowerCase()}"`,
            () => {
              assert.strictEqual(RealTokenUUID(a), addr.toLowerCase());
            }
          );
        }
      });

      describe("should throw an error if the uuid is ill-formed", function () {
        const register = prepare(this);
        // prettier-ignore
        const testcases = [
        ["", "is the empty string"],
        [addr.substring(10), "is too short"],
        [addr+"00", "is too long"],
        ["00" + addr.substring(2), "has the wrong prefix"],
      ];
        for (const [a, msg] of testcases) {
          register(`case RealTokenUUID("${a}") (uuid ${msg}))`, () => {
            assert.throws(() => RealTokenUUID(a), ValueError);
          });
        }
      });
    });
  });
});

describe("RealTokenOracle", function () {
  let api: FakeRealTokenAPI;

  beforeEach(function () {
    api = FakeRealTokenAPI.create();
  });

  describe("behavior", function () {
    let oracle: RealTokenOracle;

    beforeEach(function () {
      oracle = RealTokenOracle.create(api);
    });

    describe("behsavior", async () => {
      it("should load the history on demand", async () => {
        assert.equal(oracle.history.size, 0);
        await oracle.load();
        // jq 'length' < fixtures/RealT/tokenHistory.json
        assert.equal(oracle.history.size, 693);
      });

      it("should retrieve the raw events from a loaded history", async () => {
        await oracle.load();

        // jq '.[100] | {uuid, historyLength: (.history | length)}' < fixtures/RealT/tokenHistory.json
        const expected = {
          uuid: "0x9528a7402C0Fe85B817aa6E106EAFa03A02924c4",
          historyLength: 7,
        };
        const uuid = "0x9528a7402C0Fe85B817aa6E106EAFa03A02924c4";
        const events = oracle.getEvents(RealTokenUUID(uuid));

        assert.equal(events.length, 7);
      });

      it("should retrieve the price table for a RealToken", async () => {
        await oracle.load();

        // jq '.[100] | {uuid, historyLength: [ .history[] | [ .date, .values.tokenPrice ] | select(.[1]) ] }' < fixtures/RealT/tokenHistory.json
        const expected = [
          ["20210217", 50.07],
          ["20220611", 52.46],
        ] as const;
        const uuid = "0x9528a7402C0Fe85B817aa6E106EAFa03A02924c4";
        const priceTable = oracle.getPriceTable(RealTokenUUID(uuid));

        assert.deepEqual(
          priceTable.toArray(),
          expected.map(([d, n]) => [d, BigNumber.from(n)]) as [
            string,
            BigNumber
          ][]
        );
      });
    });

    describe("should retrieve the token price", async function () {
      const register = prepare(this);

      const testcases = [
        ["20210117", null], // this tests the case we have a konwn token but no price at the requested date
        ["20210217", 50.07],
        ["20210317", 50.07],
        ["20220511", 50.07],
        ["20220611", 52.46],
        ["20220711", 52.46],
      ] as const;
      const uuid = "0x9528a7402C0Fe85B817aa6E106EAFa03A02924c4".toLowerCase();
      const fiat = FiatCurrency("USD");
      for (const [date, value] of testcases) {
        register(`case ${date}`, async () => {
          const registry = CryptoRegistry.create();
          const crypto = registry.createCryptoAsset(
            uuid,
            "REALTOKEN-X",
            "REALTOKEN-X",
            18
          );
          registry.setNamespaceData(crypto, "REALTOKEN", { uuid });

          const prices = await oracle.getPrice(
            registry,
            crypto,
            parseDate("YYYYMMDD", date),
            [fiat]
          );

          assert.deepEqual(
            prices,
            value === null
              ? {}
              : {
                  [fiat]: crypto.price(fiat, value),
                }
          );
        });
      }
    });
  });
});
