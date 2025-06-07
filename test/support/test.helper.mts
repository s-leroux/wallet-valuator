/**
 * Checks if an environment variable is set as a boolean flag.
 * A flag is considered set if the environment variable is set to "1" or "yes" (case insensitive).
 * A flag is considered unset if the environment variable is unset, or if set to "0" or "no" (case insensitive).
 * Any other value will raise a ValueError with an informational message.
 *
 * @param envVar - The name of the environment variable to check
 * @returns true if the flag is set, false if unset
 * @throws {Error} If the environment variable has an invalid value
 */
function flag(envVar: string): boolean {
  const value = process.env[envVar]?.toLowerCase();

  if (value === undefined || value === "0" || value === "no") {
    return false;
  }

  if (value === "1" || value === "yes") {
    return true;
  }

  throw new Error(
    `Invalid value for environment variable ${envVar}: "${value}". ` +
      'Expected one of: "1", "yes", "0", "no" (case insensitive)'
  );
}
/*
type MochaGlobalFunction = (message: string, ...options: unknown[]) => void;

type Skipable = MochaGlobalFunction & {
  skip: MochaGlobalFunction;
};
*/

type Skipable = Mocha.SuiteFunction | Mocha.TestFunction;
type Outcome<T> = T extends Mocha.SuiteFunction
  ? Mocha.SuiteFunction | Mocha.PendingSuiteFunction
  : T extends Mocha.TestFunction
  ? Mocha.TestFunction | Mocha.PendingTestFunction
  : never;

/**
 * Wrapper to conditionally run or skip tests based on environment variables
 * @param options.envVar - Environment variable to check
 */
export function when<T extends Skipable>(envVar: string, fn: T): Outcome<T> {
  return (flag(envVar) ? fn : fn.skip) as Outcome<T>;
}
