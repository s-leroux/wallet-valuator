import { Command } from "commander";
import { processBlock } from "../src/lib/cli/blockexplorer.mjs";

// Initialize commander
const program = new Command();

program
  .name("blockexplorer-cli")
  .description("Command-line tool to display addresses by block")
  .version("1.0.0")
  .arguments("<block...>")
  .action(async (blocks) => processBlock(blocks));

// Parse and execute
program.parse(process.argv);

// If no arguments provided, display help
if (!process.argv.slice(2).length) {
  program.help();
}
