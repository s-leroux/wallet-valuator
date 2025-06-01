/**
 * Global test environment configuration
 *
 * This file ensures that NODE_ENV is set to "test" for all test runs.
 * This is important because:
 * 1. Some code paths may behave differently in test vs production
 * 2. It helps prevent accidental use of test helpers in production
 *
 * Note: This is a CommonJS module (.cjs) because Mocha's configuration
 * needs to be loaded before any ES modules are processed.
 */
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}
console.log(`NODE_ENV=${process.env.NODE_ENV}`);

//======================================================================
//  Mocha configuration
//======================================================================
module.exports = {
  require: "source-map-support/register",
  inspect: "0.0.0.0:9229",
};
