/**
 * Run the programs of the examples/ subdirectory, comparing their output with the expected one.
 *
 * Written for the Node.js environment
 */
import { Test } from "mocha";
import { assert } from "chai";

import { walk } from "@root/walk";

import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { fork } from "node:child_process";
import path from "node:path";
import { when } from "./support/test.helper.mjs";

const MOCHA_TIMEOUT = 4000;

const BASE_DIR = process.env.APP_ROOT_PATH || ".";
const BUILD_DIR = path.join(BASE_DIR, "build");
const SCRIPT_DIR = path.join(BUILD_DIR, "examples");

/**
 * Run a script, returning its standard output and standard error as one string
 * (chunks from each stream are appended as they arrive; cross-stream order is
 * not guaranteed to match a terminal).
 */
function run(scriptPath: string): Promise<string> {
  const child = fork(scriptPath, {
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    execArgv: ["--enable-source-maps"],
  });

  assert.isDefined(child);

  return new Promise((resolve, reject) => {
    let buff = "";
    const onData = (chunk: Buffer | string) => {
      buff += typeof chunk === "string" ? chunk : chunk.toString();
    };
    let streamsOpen = 2;
    const onStreamEnd = () => {
      streamsOpen -= 1;
      if (streamsOpen === 0) {
        resolve(buff);
      }
    };

    for (const stream of [child.stdout, child.stderr]) {
      stream!.on("data", onData);
      stream!.on("error", reject);
      stream!.on("end", onStreamEnd);
    }
  });
}

async function runAndCompare(
  scriptPath: string,
  expectedDataPath: string,
  outDataPath: string,
) {
  let expectedData: string | undefined;
  try {
    expectedData = await fs.readFile(expectedDataPath, { encoding: "utf8" });
  } catch (err) {
    console.log(`Error reading ${expectedDataPath}\n${err}`);
  }

  const output = await run(scriptPath);

  // Always store the latest output in the build directory
  try {
    await fs.writeFile(outDataPath, output);
  } catch (err) {
    throw new Error(`Error writing ${outDataPath}\n${err}`);
  }

  if (expectedData !== undefined) {
    assert.equal(output, expectedData);
  } else {
    try {
      await fs.copyFile(outDataPath, expectedDataPath);
    } catch (err) {
      throw new Error(
        `Cannot copy ${outDataPath} to ${expectedDataPath}\n${err}`,
      );
    }
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
async function walker(
  err: Error | undefined,
  pathname: string,
  _dirent: Dirent,
): Promise<false | undefined> {
  if (err) {
    return false;
  }
  const file = path.parse(pathname);
  if (file.ext === ".mjs") {
    // Locate the corresponding output file
    const scriptPath = pathname;
    const stem = path.relative(BUILD_DIR, file.dir);
    const expectedDataPath = path.join(stem, file.name + ".txt");
    const outDataPath = path.join(file.dir, file.name + ".txt");
    addTest(`${scriptPath} should run`, () =>
      runAndCompare(scriptPath, expectedDataPath, outDataPath),
    );
  }
}

function addTest(title: string, fct: Mocha.AsyncFunc | Mocha.Func) {
  const test = new Test(title, fct);
  suite?.addTest(test);
}

 
const suite = when("EXAMPLES", describe)("Example programs", function () {
  this.timeout(MOCHA_TIMEOUT);
  this.slow(MOCHA_TIMEOUT / 2);
});

await walk(SCRIPT_DIR, walker);
