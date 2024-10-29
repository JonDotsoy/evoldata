import { readableStreamToIterable, SplitStream } from "streamable-tools";

type Payload = string;
type Path = number | string;
type Metadata = {
  timestamp: number;
  type: "=" | "+";
  path: Path[];
  value: unknown;
};

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
    const childPath = paths.splice(0, paths.length - 1);
    const property = paths[paths.length - 1];

    const child = selectChild(object, childPath, () => ({}));

    if (isRecord(child)) {
      child[property] = value;
    }
  };

  export const add = (object: unknown, paths: Path[], value: unknown) => {
    if (paths.length < 1) return;
    const parentPaths = paths.splice(0, paths.length - 1);
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

  export namespace path {
    export const serialize = (paths: Path[]) =>
      paths
        .map((path) =>
          `${path}`.replace(/\W/g, (c) =>
            [".", "$"].includes(c) ? `$${c.charCodeAt(0)}` : c,
          ),
        )
        .join(".");

    export const deserialize = (path: string) =>
      path
        .split(".")
        .map((part) =>
          part.replace(/\$(\d+)/, (_, c) => String.fromCharCode(Number(c))),
        )
        .map((e) => (/^\d+$/.test(e) ? Number(e) : e));
  }
}

const payloadToReadable = (payload: Payload) => {
  if (typeof payload === "string") return new TextEncoder().encode(payload);

  throw new Error("Payload must be a string");
};

const TAB_CODE = "\t".charCodeAt(0);
const NEW_LINE_CODE = "\n".charCodeAt(0);

function* transformLines(buff: Uint8Array): Generator<Metadata> {
  let index = 0;

  const findPart = (delimiter: number) => {
    const a = buff.indexOf(delimiter, index);
    const po = a === -1 ? buff.length : a;
    const part = buff.slice(index, po);
    index = po + 1;
    const chunk = new TextDecoder().decode(part);
    return chunk;
  };

  while (index < buff.length) {
    const timestampBuff = Number(findPart(TAB_CODE));
    const action = findPart(TAB_CODE);
    const path = utils.path.deserialize(findPart(TAB_CODE));
    const value = JSON.parse(findPart(NEW_LINE_CODE));

    yield {
      timestamp: timestampBuff,
      type: action as "=" | "+",
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
    const chunk = stringifyLineEvent({
      timestamp: Date.now(),
      type: action as "=" | "+",
      path: paths,
      value,
    });

    controller?.enqueue(new TextEncoder().encode(chunk));
  };

  return {
    readable,
    close: () => {
      controller?.close();
    },
    set(path: Path[], value: unknown) {
      makeEvent("=", path, value);
    },
    add(path: Path[], value: unknown) {
      makeEvent("+", path, value);
    },
  };
};

export class ParsingObjectStream extends TransformStream<Uint8Array, any> {
  #obj: { context: any } = { context: {} };

  constructor() {
    super({
      transform: async (chunk, controller) => {
        try {
          for (const metadata of transformLines(chunk)) {
            if (metadata.type === "=") {
              utils.set(this.#obj.context, metadata.path, metadata.value);
            }
            if (metadata.type === "+") {
              utils.add(this.#obj.context, metadata.path, metadata.value);
            }
            controller.enqueue(this.#obj.context);
          }
        } catch {}
      },
    });
  }

  static iterable(readable: ReadableStream<Uint8Array>) {
    return readableStreamToIterable(
      readable
        .pipeThrough(new SplitStream())
        .pipeThrough(new ParsingObjectStream()),
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
