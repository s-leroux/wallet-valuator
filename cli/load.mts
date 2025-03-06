import { Command } from "commander";
import { load } from "../src/lib/cli/loader.mjs";

// Initialize commander
const program = new Command();

program
  .name("loader")
  .description("Command-line tool to load prices in a date range")
  .version("1.0.0")
  .arguments("start end [cryptoid...]")
  .action(async (start, end, cryptoid) => load(start, end, cryptoid));

// Parse and execute
program.parse(process.argv);

// If no arguments provided, display help
if (!process.argv.slice(2).length) {
  program.help();
}
