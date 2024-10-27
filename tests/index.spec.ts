import { describe, it, expect } from "bun:test";
import { parse, utils, createEventsWritable } from "../src";

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
