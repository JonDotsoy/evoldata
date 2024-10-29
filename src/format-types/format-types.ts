export enum FormatTypes {
  JSON,
  YAML,
  JSON5,
}

const parsingFormatList: Record<string, FormatTypes | undefined> = {
  json: FormatTypes.JSON,
  yaml: FormatTypes.YAML,
  yml: FormatTypes.YAML,
  json5: FormatTypes.JSON5,
  js: FormatTypes.JSON5,
};

export const parsingFormat = (format: string) =>
  parsingFormatList[format.toLowerCase()] ?? FormatTypes.JSON;
