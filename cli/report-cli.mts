import { Command } from "commander";
import { processAddresses } from "../src/lib/cli/report.mjs";
import { PACKAGE_VERSION } from "../src/version.mjs";

// Initialize commander
const program = new Command();

/**
 * Generate an accounting report from a configuration file.
 */
program
  .name("report-cli")
  .description("Generate a text report for income tax declarations")
  .showHelpAfterError()
  .version(PACKAGE_VERSION)
  .option("-c, --config <config.json>", "JSON configuration")
  .action(async (options) => processAddresses(options.config as string));

// Parse and execute
program.parse(process.argv);

// If no arguments provided, display help
if (!process.argv.slice(2).length) {
  program.help();
}
