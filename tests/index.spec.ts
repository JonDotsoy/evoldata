import * as YAML from "yaml";
import { describe, it, expect, mock } from "bun:test";
import {
  parse,
  utils,
  createEventsWritable,
  ParsingObjectStream,
} from "../src";
import { SplitStream, readableStreamToIterable } from "streamable-tools";

const payload = `1730041100000	=	owner.name	${JSON.stringify("John")}
1730041100000	=	owner.runOn	${JSON.stringify("Ubuntu 30.04")}
1730041200000	=	server.ip	${JSON.stringify("10.0.0.1")}
1730041200000	=	server.port	${JSON.stringify(22)}
1730041300000	=	client.state	${JSON.stringify("stable")}
1730041300000	=	client.pid	${JSON.stringify(1000)}
1730041300000	+	client.logs	${JSON.stringify("Connected to server.")}
1730041400000	=	client.delay	${JSON.stringify(100)}
1730041500000	=	client.state	${JSON.stringify("unstable")}
1730041500000	+	server.commands	${JSON.stringify("date")}
1730041600000	+	client.logs	${JSON.stringify("Sun Oct 27 12:12:48 -03 2024\n")}
`;

describe("utils", () => {
  it("set() should create nested objects and set the value at the specified path", () => {
    const obj = {};
    utils.set(obj, ["a", "b", "c"], "abc");

    expect(obj).toEqual({
      a: {
        b: {
          c: "abc",
        },
      },
    });
  });

  it("set() should create nested objects with numeric keys and set the value", () => {
    const obj = {};
    utils.set(obj, ["a", 0, "c"], "abc");

    expect(obj).toEqual({
      a: {
        0: {
          c: "abc",
        },
      },
    });
  });

  it("add() should create nested objects with numeric keys and initialize an array with the value", () => {
    const obj = {};
    utils.add(obj, ["a", 0, "c"], "abc");

    expect(obj).toEqual({
      a: {
        0: {
          c: ["abc"],
        },
      },
    });
  });

  it("set() should add a new property to an existing nested object", () => {
    const obj: any = { a: { 0: { c: { d: "abc" } } } };
    utils.set(obj, ["a", 0, "e"], "abc");

    expect(obj).toEqual({ a: { 0: { c: { d: "abc" }, e: "abc" } } });
  });

  it("add() should overwrite existing property with an array if the property is not an array", () => {
    const obj: any = { a: { 0: { c: { d: "abc" } } } };
    utils.add(obj, ["a", 0, "c"], "abc");

    expect(obj).toEqual({ a: { 0: { c: ["abc"] } } });
  });

  it("add() should initialize an array with the value if the path does not exist", () => {
    const obj: any = {};
    utils.add(obj, ["a"], "abc");

    expect(obj).toEqual({ a: ["abc"] });
  });

  it("add() should append multiple values to an array at the specified path", () => {
    const obj: any = {};
    utils.add(obj, ["a", 0, "c"], "abc");
    utils.add(obj, ["a", 0, "c"], "def");
    utils.add(obj, ["a", 0, "c"], "zzz");

    expect(obj).toEqual({
      a: {
        0: {
          c: ["abc", "def", "zzz"],
        },
      },
    });
  });

  it("at() should create nested objects with undefined values for non-existing paths", () => {
    const obj = {};
    utils.selectChild(obj, ["a", "b", "c"]);

    expect(obj).toEqual({ a: { b: { c: undefined } } });
  });
});

describe("path", () => {
  describe("serialize", () => {
    it("should serialize a path with special characters", () => {
      expect(utils.path.serialize(["a", ".", "b"])).toEqual("a.$46.b");
    });
    it("should serialize a path with multiple special characters", () => {
      expect(utils.path.serialize(["a", "$", ".", "b"])).toEqual("a.$36.$46.b");
    });
    it("should serialize a path with special characters and starting with '-'", () => {
      expect(utils.path.serialize(["-", "$", ".", "[]"])).toEqual(
        "-.$36.$46.[]",
      );
    });
    it("should serialize a path with special characters, starting with '-' and containing a number", () => {
      expect(utils.path.serialize(["-", 10, "$", ".", "[]"])).toEqual(
        "-.10.$36.$46.[]",
      );
    });
  });
  describe("desearilize", () => {
    it("should deserialize a path with special characters", () => {
      expect(utils.path.deserialize("a.$46.b")).toEqual(["a", ".", "b"]);
    });
    it("should deserialize a path with multiple special characters", () => {
      expect(utils.path.deserialize("a.$36.$46.b")).toEqual([
        "a",
        "$",
        ".",
        "b",
      ]);
    });
    it("should deserialize a path with special characters and starting with '-'", () => {
      expect(utils.path.deserialize("-.$36.$46.[]")).toEqual([
        "-",
        "$",
        ".",
        "[]",
      ]);
    });
    it("should deserialize a path with special characters, starting with '-' and containing a number", () => {
      expect(utils.path.deserialize("-.10.$36.$46.[]")).toEqual([
        "-",
        10,
        "$",
        ".",
        "[]",
      ]);
    });
  });
});

it("parse() should parse a payload string into an object", () => {
  const obj = parse(payload);

  expect(obj).toMatchSnapshot();
});

it("createEventsWritable() should create a writable stream that emits events as strings", async () => {
  const writable = createEventsWritable();

  writable.set(["name"], "Jhon");
  writable.set(["age"], 32);

  writable.close();

  const read = writable.readable.pipeThrough(new TextDecoderStream());

  const text = await Bun.readableStreamToText(read);

  const lines = text.split("\n");
  expect(lines.at(0)).toMatch('=\tname\t"Jhon"');
  expect(lines.at(1)).toMatch("=\tage\t32");
});

const createSampleReadable = () =>
  new ReadableStream<Uint8Array>({
    start(ctrl) {
      const line = async (line: string) =>
        ctrl.enqueue(new TextEncoder().encode(`${line}\n`));

      line(`1730041100000	=	owner.name	"John"`);
      line(`1730041100000	=	owner.runOn	"Ubuntu 30.04"`);
      line(`1730041200000	=	server.ip	"10.0.0.1"`);
      line(`1730041200000	=	server.port	22`);
      line(`1730041300000	=	client.state	"stable"`);
      line(`1730041300000	=	client.pid	1000`);
      line(`1730041300000	+	client.logs	"Connected to server."`);
      line(`1730041400000	=	client.delay	100`);
      line(`1730041500000	=	client.state	"unstable"`);
      line(`1730041500000	+	server.commands	"date"`);
      line(`1730041600000	+	client.logs	"Sun Oct 27 12:12:48 -03 2024\n"`);
      line(`1730041600000	=	done	true`);

      ctrl.close();
    },
  });

it("StreamSnapParsing should parse a stream of events into an array of objects", async () => {
  const readable = createSampleReadable()
    .pipeThrough(new SplitStream())
    .pipeThrough(new ParsingObjectStream());
  for await (const snap of readableStreamToIterable(readable)) {
    expect(snap).toMatchSnapshot();
  }
});

it("ParsingObjectStream.store() should create a store that updates on each event", async () => {
  const update = mock();

  const store = ParsingObjectStream.store(createSampleReadable());

  update(JSON.stringify(store.getSnapshot()));

  await new Promise<void>((done) => {
    store.subscribe(() => {
      const snapshot = store.getSnapshot();
      update(JSON.stringify(snapshot, null, 2));
      if (snapshot.done) done();
    });
  });

  expect(update).toBeCalledTimes(12);
  expect(update.mock.calls).toMatchSnapshot();
});

it("utils.set() should not mutate the path array", () => {
  const obj: any = { a: { b: {} } };
  const path: string[] = ["a", "b", "c", "d"];

  utils.set(obj, path, "e");

  expect(path).toEqual(["a", "b", "c", "d"]);
});

it("utils.add() should not mutate the path array", () => {
  const obj: any = { a: { b: {} } };
  const path: string[] = ["a", "b", "c", "d"];

  utils.add(obj, path, "e");

  expect(path).toEqual(["a", "b", "c", "d"]);
});
