export var utils;
(function (utils) {
  const isRecord = (value) => typeof value === "object" && value !== null;
  utils.selectChild = (object, paths, initLastPath = () => undefined) => {
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
    return utils.selectChild(child, restPaths, initLastPath);
  };
  utils.selectRecordChild = (object, paths) => {};
  utils.set = (object, paths, value) => {
    const childPath = paths.splice(0, paths.length - 1);
    const property = paths[paths.length - 1];
    const child = utils.selectChild(object, childPath, () => ({}));
    if (isRecord(child)) {
      child[property] = value;
    }
  };
  utils.add = (object, paths, value) => {
    if (paths.length < 1) return;
    const parentPaths = paths.splice(0, paths.length - 1);
    const property = paths[paths.length - 1];
    const parentSelect = utils.selectChild(object, parentPaths, () => ({}));
    const parent = isRecord(parentSelect) ? parentSelect : {};
    const childIsArray = Array.isArray(parent[property]);
    if (childIsArray) {
      parent[property].push(value);
    } else {
      parent[property] = [value];
    }
  };
  let path;
  (function (path_1) {
    path_1.serialize = (paths) =>
      paths
        .map((path) =>
          `${path}`.replace(/\W/g, (c) =>
            [".", "$"].includes(c) ? `$${c.charCodeAt(0)}` : c,
          ),
        )
        .join(".");
    path_1.deserialize = (path) =>
      path
        .split(".")
        .map((part) =>
          part.replace(/\$(\d+)/, (_, c) => String.fromCharCode(Number(c))),
        )
        .map((e) => (/^\d+$/.test(e) ? Number(e) : e));
  })((path = utils.path || (utils.path = {})));
})(utils || (utils = {}));
const payloadToReadable = (payload) => {
  if (typeof payload === "string") return new TextEncoder().encode(payload);
  throw new Error("Payload must be a string");
};
const TAB_CODE = "\t".charCodeAt(0);
const NEW_LINE_CODE = "\n".charCodeAt(0);
function* transformLines(buff) {
  let index = 0;
  const findPart = (delimiter) => {
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
      type: action,
      path,
      value,
    };
  }
}
export const parse = (payload) => {
  const obj = {};
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
export const stringifyLineEvent = (metadata) => {
  const { timestamp, type, path, value } = metadata;
  return `${timestamp}\t${type}\t${utils.path.serialize(path)}\t${JSON.stringify(value)}\n`;
};
export const createEventsWritable = () => {
  let controller = null;
  const readable = new ReadableStream({
    start: (ctr) => {
      controller = ctr;
    },
  });
  const makeEvent = (action, paths, value) => {
    const chunk = stringifyLineEvent({
      timestamp: Date.now(),
      type: action,
      path: paths,
      value,
    });
    controller === null || controller === void 0
      ? void 0
      : controller.enqueue(new TextEncoder().encode(chunk));
  };
  return {
    readable,
    close: () => {
      controller === null || controller === void 0
        ? void 0
        : controller.close();
    },
    set(path, value) {
      makeEvent("=", path, value);
    },
    add(path, value) {
      makeEvent("+", path, value);
    },
  };
};
