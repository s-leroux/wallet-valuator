import { Command } from "commander";
import { processAddresses } from "../src/lib/cli/addressprocessor.mjs";

// Initialize commander
const program = new Command();

program
  .name("blockchain-cli")
  .description("Command-line tool to display blockchain addresses")
  .showHelpAfterError()
  .version("1.1.0")
  .option("-c, --config <config.json>", "JSON configuration")
  .action(async (options) => processAddresses(options.config));

// Parse and execute
program.parse(process.argv);

// If no arguments provided, display help
if (!process.argv.slice(2).length) {
  program.help();
}
