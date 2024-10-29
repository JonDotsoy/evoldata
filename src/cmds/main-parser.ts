import {
  commandOption,
  flag,
  flags,
  isBooleanAt,
  isStringAt,
  makeHelpMessage,
  rule,
  type Rule,
} from "@jondotsoy/flags";
import { parsingFormat } from "../format-types/format-types";

type Options = {
  scriptFile: string;
  cwd: string;
  format: string;
  help: string;
};

const rules: Rule<Options>[] = [
  rule(flag("--cwd", "-w"), isStringAt("cwd"), {
    description: "Current working directory",
  }),
  rule(flag("--format", "-f"), isStringAt("format"), {
    description:
      "Choice the format to print. YAML, JSON or JSON5. Default is YAML",
  }),
  rule(flag("--help", "-h"), isBooleanAt("help"), {
    description: "Show this help message",
  }),
  rule(commandOption("scriptFile"), isStringAt("scriptFile"), {
    description: "Script file to run",
  }),
];

export const mainHelp = (command: string) =>
  makeHelpMessage(command, rules, ["[file.evoldata]"]);

export const mainParser = (args: string[]) => {
  const options = flags(args, {}, rules);

  return {
    scriptFile: options.scriptFile
      ? new URL(
          options.scriptFile,
          new URL(`${options.cwd ?? process.cwd()}/`, "file:"),
        )
      : null,
    format: parsingFormat(options.format ?? "yaml"),
    showHelp: options.help ?? false,
  };
};
