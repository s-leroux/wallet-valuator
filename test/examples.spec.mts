/**
 * Run the programs of the examples/ subdirectory, comparing their output with the expected one.
 *
 * Written for the Node.js environment
 */
import { Test } from "mocha";
import { assert } from "chai";

import { walk } from "@root/walk";

import { promises as fs } from "node:fs";
import { fork } from "node:child_process";
import path from "node:path";
import { when } from "./support/test.helper.mjs";

const MOCHA_TIMEOUT = 4000;

const BASE_DIR = process.env.APP_ROOT_PATH || ".";
const BUILD_DIR = path.join(BASE_DIR, "build");
const SCRIPT_DIR = path.join(BUILD_DIR, "examples");

/**
 * Run a script, returning its standard output as a string.
 */
function run(scriptPath: string): Promise<string> {
  const child = fork(scriptPath, {
    stdio: ["ignore", "pipe", null, "ipc"],
  });

  assert.isDefined(child);

  return new Promise((resolve, reject) => {
    let buff = "";
    child.stdout!.on("data", (chunk) => {
      buff += chunk.toString();
    });
    child.stdout!.on("error", reject);
    child.stdout!.on("end", () => resolve(buff));
  });
}

async function runAndCompare(
  scriptPath: string,
  expectedDataPath: string,
  outDataPath: string
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
        `Cannot copy ${outDataPath} to ${expectedDataPath}\n${err}`
      );
    }
  }
}

async function walker(err: any, pathname: string, dirent: string) {
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
      runAndCompare(scriptPath, expectedDataPath, outDataPath)
    );
  }
}

function addTest(title: string, fct: any) {
  const test = new Test(title, fct);
  suite?.addTest(test);
}

const suite = when("EXAMPLES", describe)("Example programs", async function () {
  this.timeout(MOCHA_TIMEOUT);
  this.slow(MOCHA_TIMEOUT / 2);
});

await walk(SCRIPT_DIR, walker);
