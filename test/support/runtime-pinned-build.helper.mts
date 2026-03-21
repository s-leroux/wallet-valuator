import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { when } from "./test.helper.mjs";

let cachedBuildRootContainingGitSha: string | undefined;

function findBuildRootContainingGitSha(startDir: string): string {
  let dir = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, "GIT_SHA.txt"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `GIT_SHA.txt not found walking up from ${startDir} (expected under TypeScript outDir)`,
      );
    }
    dir = parent;
  }
}

function getBuildRootContainingGitSha(): string {
  if (cachedBuildRootContainingGitSha !== undefined) {
    return cachedBuildRootContainingGitSha;
  }
  const helperDir = path.dirname(fileURLToPath(import.meta.url));
  cachedBuildRootContainingGitSha = findBuildRootContainingGitSha(helperDir);
  return cachedBuildRootContainingGitSha;
}

/**
 * Ensures runtime-emitted test code comes from the expected repo revision.
 *
 * Locates `GIT_SHA.txt` by walking up from this helper’s compiled location
 * (`outDir/test/support/…`), which shares the same TypeScript `outDir` as spec
 * files (e.g. `build/` or `build-migration/`). The resolved directory is cached
 * for the process so repeated pins do not repeat the walk. The file’s content
 * is compared with the git SHA from an environment variable (by default
 * `EXPECTED_GIT_SHA`).
 *
 * If the environment variable is not set, the test is skipped.
 *
 * Call this **inside** the most relevant top-level `describe` callback.
 *
 * Migration slice: after compiling with `tsconfig.migration.json`, refresh the
 * stamp with `npm run compile-migration` (or `git rev-parse HEAD >
 * build-migration/GIT_SHA.txt`) so `EXPECTED_GIT_SHA=$(git rev-parse HEAD)`
 * matches the emitted tests under `build-migration/`.
 */
export function registerRuntimePinnedBuildTest(
  expectedGitShaEnvVar: string = "EXPECTED_GIT_SHA",
): void {
  const expectedGitSha = process.env[expectedGitShaEnvVar];
  when(expectedGitShaEnvVar, it)(
    "should be built from the expected git revision (runtime pinned build)",
    () => {
      const buildRoot = getBuildRootContainingGitSha();
      const builtGitSha = fs
        .readFileSync(path.join(buildRoot, "GIT_SHA.txt"), "utf8")
        .trim();

      assert.strictEqual(builtGitSha, expectedGitSha);
    },
  );
}
