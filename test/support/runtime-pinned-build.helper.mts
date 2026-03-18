import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Ensures runtime-emitted test code comes from the expected repo revision.
 *
 * The test reads `GIT_SHA.txt` from the build root directory (e.g. `build/`),
 * where the compiled `build/test/*.spec.mjs` files live as children.
 */
export function registerRuntimePinnedBuildTest(
  testMetaUrl: string,
  expectedGitShaEnvVar: string = "EXPECTED_GIT_SHA"
): void {
  it(
    "should be built from the expected git revision (runtime pinned build)",
    () => {
      const expectedGitSha = process.env[expectedGitShaEnvVar];
      if (expectedGitSha === undefined) return;

      const compiledTestPath = fileURLToPath(testMetaUrl);
      // test/*.spec.mjs -> build root
      const buildRoot = path.resolve(path.dirname(compiledTestPath), "..");
      const builtGitSha = fs
        .readFileSync(path.join(buildRoot, "GIT_SHA.txt"), "utf8")
        .trim();

      assert.strictEqual(builtGitSha, expectedGitSha);
    }
  );
}

