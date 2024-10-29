import * as fs from "fs/promises";
import { mainHelp, mainParser } from "./cmds/main-parser";
import { parse } from ".";
import * as YAML from "yaml";
import * as JSON5 from "json5";
import { format } from "prettier";
import { FormatTypes } from "./format-types/format-types";

const main = async () => {
  const { scriptFile, format, showHelp } = mainParser(process.argv.slice(2));

  if (!scriptFile || showHelp) return console.log(mainHelp(process.argv[1]));

  const out = parse(await fs.readFile(scriptFile, "utf-8"));

  if (format === FormatTypes.JSON)
    return console.log(JSON.stringify(out, null, 2));
  if (format === FormatTypes.JSON5)
    return console.log(JSON5.stringify(out, null, 2));
  if (format === FormatTypes.YAML)
    return console.log(YAML.stringify(out, null, 2));
  // console.log("🚀 ~ main ~ out:", out)
};

await main();
