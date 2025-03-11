import { readableStreamToIterable, SplitStream } from "streamable-tools";
import { result } from "@jondotsoy/utils-js/result";

type Payload = string;
type Path = number | string;
type MetadataDelete = {
  timestamp: number;
  type: "-";
  path: Path[];
  value: undefined;
};
type MetadataUpdate = {
  timestamp: number;
  type: "=" | "+";
  path: Path[];
  value: unknown;
};
type Metadata = MetadataUpdate | MetadataDelete;

export namespace utils {
  const isRecord = (
    value: unknown,
  ): value is Record<string | string | number, unknown> =>
    typeof value === "object" && value !== null;

  export const selectChild = (
    object: unknown,
    paths: Path[],
    initLastPath: () => any = () => undefined,
  ): unknown => {
    const objectIsRecord = isRecord(object);
    if (!objectIsRecord) return;
    if (paths.length <= 0) return object;

    const [property, ...restPaths] = paths;
    const isLastPath = restPaths.length <= 0;

    const child = isRecord(object[property])
      ? object[property]
      : isLastPath
        ? initLastPath()
        : {};
    object[property] = child;

    return selectChild(child, restPaths, initLastPath);
  };

  export const selectRecordChild = (object: unknown, paths: Path[]) => {};

  export const set = (object: unknown, paths: Path[], value: unknown) => {
    const childPath = paths.slice(0, paths.length - 1);
    const property = paths[paths.length - 1];

    const child = selectChild(object, childPath, () => ({}));

    if (isRecord(child)) {
      child[property] = value;
    }
  };

  export const add = (object: unknown, paths: Path[], value: unknown) => {
    if (paths.length < 1) return;
    const parentPaths = paths.slice(0, paths.length - 1);
    const property = paths[paths.length - 1];
    const parentSelect = selectChild(object, parentPaths, () => ({}));
    const parent: any = isRecord(parentSelect) ? parentSelect : {};
    const childIsArray = Array.isArray(parent[property]);

    if (childIsArray) {
      parent[property].push(value);
    } else {
      parent[property] = [value];
    }
  };

  export const del = (object: unknown, paths: Path[]) => {
    const childPath = paths.slice(0, paths.length - 1);
    const property = paths[paths.length - 1];

    const child = selectChild(object, childPath, () => ({}));

    if (isRecord(child)) {
      child[property] = undefined;
    }
  };

  export namespace path {
    export const serialize = (paths: Path[]) =>
      paths
        .map((path) => `${path}`.replace(/\W/g, (c) => `%${c.charCodeAt(0)}`))
        .join(".");

    export const deserialize = (path: string) =>
      path
        .split(".")
        .map((part) =>
          part.replace(/\%(\d+)/, (_, c) => String.fromCharCode(Number(c))),
        )
        .map((e) => (/^\d+$/.test(e) ? Number(e) : e));
  }
}

const payloadToReadable = (payload: Payload) => {
  if (typeof payload === "string") return new TextEncoder().encode(payload);

  throw new Error("Payload must be a string");
};

const TAB_CHAR = "\t";
const TAB_CODE = TAB_CHAR.charCodeAt(0);
const NEW_LINE_CODE = "\n".charCodeAt(0);

const findPart = (
  buff: Uint8Array,
  indexState: { current: number },
  delimiter: number,
) => {
  const a = buff.indexOf(delimiter, indexState.current);
  const po = a === -1 ? buff.length : a;
  const part = buff.slice(indexState.current, po);
  indexState.current = po + 1;
  const chunk = new TextDecoder().decode(part);
  return chunk;
};

function* transformLines(buff: Uint8Array): Generator<Metadata> {
  let indexState = { current: 0 };

  while (indexState.current < buff.length) {
    const timestampBuff = Number(findPart(buff, indexState, TAB_CODE));
    const action = findPart(buff, indexState, TAB_CODE);
    const path = utils.path.deserialize(findPart(buff, indexState, TAB_CODE));
    const value = JSON.parse(findPart(buff, indexState, NEW_LINE_CODE));

    yield {
      timestamp: timestampBuff,
      type: action as "=" | "+" | "-",
      path,
      value,
    };
  }
}

export const parse = (payload: Payload): any => {
  const obj: any = {};

  for (const a of transformLines(payloadToReadable(payload))) {
    if (a.type === "=") {
      utils.set(obj, a.path, a.value);
    }
    if (a.type === "+") {
      utils.add(obj, a.path, a.value);
    }
  }

  return obj;
};

export const stringifyLineEvent = (metadata: Metadata) => {
  const { timestamp, type, path, value } = metadata;
  if (type === "-")
    return `${timestamp}\t${type}\t${utils.path.serialize(path)}\n`;
  return `${timestamp}\t${type}\t${utils.path.serialize(path)}\t${JSON.stringify(value)}\n`;
};

export const createEventsWritable = () => {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  const readable = new ReadableStream<Uint8Array>({
    start: (ctr) => {
      controller = ctr;
    },
  });

  const makeEvent = (action: string, paths: Path[], value: unknown) => {
    const chunk = stringifyLineEvent(
      action === "-"
        ? {
            timestamp: Date.now(),
            type: action as "-",
            path: paths,
            value: undefined,
          }
        : {
            timestamp: Date.now(),
            type: action as "=" | "+",
            path: paths,
            value,
          },
    );

    controller?.enqueue(new TextEncoder().encode(chunk));
  };

  return {
    readable,
    close: () => {
      controller?.close();
    },
    set: (path: Path[], value: unknown) => {
      makeEvent("=", path, value);
    },
    add: (path: Path[], value: unknown) => {
      makeEvent("+", path, value);
    },
    del: (path: Path[]) => {
      makeEvent("-", path, undefined);
    },
  };
};

function* bufferTransformLines(
  accumState: { current: Uint8Array },
  inputBuff: Uint8Array,
): Generator<Metadata> {
  let buff = new Uint8Array([...accumState.current, ...inputBuff]);

  while (true) {
    const newLineIndex = buff.indexOf(NEW_LINE_CODE);
    if (newLineIndex === -1) {
      accumState.current = buff;
      return;
    }

    const line = buff.slice(0, newLineIndex);
    buff = buff.slice(newLineIndex + 1);

    const [timestampPart, typePart, pathPart, valuePart] = new TextDecoder()
      .decode(line)
      .split(TAB_CHAR, 4);

    if (!/^\d+$/.test(timestampPart)) continue;
    if (!/^(\=|\+|\-)$/.test(typePart)) continue;
    const [pathPartParseError, path] = result(() =>
      utils.path.deserialize(pathPart),
    );
    if (pathPartParseError) continue;
    const [valuePartParseError, value] = result(() => JSON.parse(valuePart));
    if (valuePartParseError) continue;

    yield {
      timestamp: Number(timestampPart),
      type: typePart as "=" | "+" | "-",
      path: path,
      value: value,
    } as any;
  }
}

export class ParsingObjectStream extends TransformStream<Uint8Array, any> {
  #obj: { context: any } = { context: {} };
  #accumBuff = { current: new Uint8Array([]) };

  constructor() {
    super({
      transform: async (chunk, controller) => {
        try {
          for (const metadata of bufferTransformLines(this.#accumBuff, chunk)) {
            if (metadata.type === "=") {
              utils.set(this.#obj.context, metadata.path, metadata.value);
            }
            if (metadata.type === "+") {
              utils.add(this.#obj.context, metadata.path, metadata.value);
            }
            if (metadata.type === "-") {
              utils.del(this.#obj.context, metadata.path);
            }
          }
          controller.enqueue(this.#obj.context);
        } catch (ex) {
          console.error(ex);
        }
      },
    });
  }

  static iterable(readable: ReadableStream<Uint8Array>) {
    return readableStreamToIterable(
      readable.pipeThrough(new ParsingObjectStream()),
    );
  }

  static store(readable: ReadableStream<Uint8Array>) {
    const snapshot: { current: any } = { current: {} };
    const listeners = new Set<() => void>();

    const loop = async () => {
      for await (const snap of ParsingObjectStream.iterable(readable)) {
        snapshot.current = snap;
        listeners.forEach((listener) => listener());
      }
    };

    loop()
      .catch((err) => console.error(err))
      .finally();

    const subscribe = (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
    const getSnapshot = () => snapshot.current;

    return { subscribe, getSnapshot };
  }
}
