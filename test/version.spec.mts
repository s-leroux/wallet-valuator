import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const assert: Chai.Assert = chai.assert;

import packageJson from "../package.json" with { type: "json" };
import {
  PACKAGE_CHANGELOG,
  PACKAGE_NAME,
  PACKAGE_VERSION,
} from "../src/version.mjs";

describe("Version", () => {
  it("agrees with package.json name and version", () => {
    assert.strictEqual(PACKAGE_NAME, packageJson.name);
    assert.strictEqual(PACKAGE_VERSION, packageJson.version);
  });

  it("includes a changelog entry for the current version", () => {
    assert.isTrue(
      Object.prototype.hasOwnProperty.call(PACKAGE_CHANGELOG, PACKAGE_VERSION),
    );
  });
});
