import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { when } from "./test.helper.mjs";

/**
 * Ensures runtime-emitted test code comes from the expected repo revision.
 *
 * The test reads `GIT_SHA.txt` from the build root directory (e.g. `build/` or
 * `build-migration/`, depending on how the test was compiled) and compares
 * that content with the git SHA provided via an environment variable
 * (by default `EXPECTED_GIT_SHA`).
 *
 * If the environment variable is not set, the test is skipped.
 */
export function registerRuntimePinnedBuildTest(
  testMetaUrl: string,
  expectedGitShaEnvVar: string = "EXPECTED_GIT_SHA",
): void {
  const expectedGitSha = process.env[expectedGitShaEnvVar];
  when(expectedGitShaEnvVar, it)(
    "should be built from the expected git revision (runtime pinned build)",
    () => {
      const compiledTestPath = fileURLToPath(testMetaUrl);
      // test/*.spec.mjs -> build root
      const buildRoot = path.resolve(path.dirname(compiledTestPath), "..");
      const builtGitSha = fs
        .readFileSync(path.join(buildRoot, "GIT_SHA.txt"), "utf8")
        .trim();

      assert.strictEqual(builtGitSha, expectedGitSha);
    },
  );
}
