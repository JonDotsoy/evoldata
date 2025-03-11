# EVOLDATA

[Versión en Español](./docs/es/README.md)

This file format is designed to store structured data that evolves over time. It provides a flexible and efficient way to record changes to an object's properties. The format is human-readable and is compatible with common data interchange formats like JSON, YAML, or TOML, ensuring seamless integration with various systems.

## Example

```evoldata
1730041100000	=	owner.name	"John"
1730041100000	=	owner.runOn	"Ubuntu 30.04"
1730041200000	=	server.ip	"10.0.0.1"
1730041200000	=	server.port	22
1730041300000	=	client.state	"stable"
1730041300000	=	client.pid	1000
1730041300000	+	client.logs	"Connected to server."
1730041400000	=	client.delay	100
1730041500000	=	client.state	"unstable"
1730041500000	+	server.commands	"date"
1730041600000	+	client.logs	"Sun Oct 27 12:12:48 -03 2024\n"
```

## API

### `parse(payload)`

Parses a multiline string payload in Evoldata format and transforms it into a JavaScript object.

**Parameters:**

- `payload`: `string` - A multiline string containing Evoldata formatted data.

**Returns:**

- `object` - A JavaScript object representing the parsed Evoldata. The structure of the object is built based on the paths defined in the Evoldata payload, with the latest values applied according to the timestamps and operations.

**Sample:**

```ts
import { parse } from "evoldata";

const payload = `
1730041100000	=	owner.name	"John"
1730041100000	=	owner.runOn	"Ubuntu 30.04"
1730041200000	=	server.ip	"10.0.0.1"
1730041200000	=	server.port	22
1730041300000	=	client.state	"stable"
1730041300000	=	client.pid	1000
1730041300000	+	client.logs	"Connected to server."
1730041400000	=	client.delay	100
1730041500000	=	client.state	"unstable"
1730041500000	+	server.commands	"date"
1730041600000	+	client.logs	"Sun Oct 27 12:12:48 -03 2024\n"
`;

const data = parse(payload);
console.log(data);
// =>
// {
//   "client": {
//     "delay": 100,
//     "logs": [
//       "Connected to server.",
//       "Sun Oct 27 12:12:48 -03 2024\n",
//     ],
//     "pid": 1000,
//     "state": "unstable",
//   },
//   "owner": {
//     "name": "John",
//     "runOn": "Ubuntu 30.04",
//   },
//   "server": {
//     "commands": [
//       "date",
//     ],
//     "ip": "10.0.0.1",
//     "port": 22,
//   },
// }
```

### `createEventsWritable()`

Creates a writable interface for programmatically generating an Evoldata document. This is useful for creating Evoldata content dynamically, line by line.

**Returns:**

- `object` - An object containing methods to interact with the Evoldata stream:
  - `readable`: `ReadableStream<string>` - A ReadableStream that yields lines of Evoldata formatted string as events are added. You can use this stream to consume the generated Evoldata content.
  - `set(path: string[], value: any)`: `function` - Adds a "set" operation to the Evoldata stream.
    - `path`: An array of strings representing the path to the property to be set (e.g., `["owner", "name"]`).
    - `value`: The JSON value to be set at the specified path.
  - `add(path: string[], value: any)`: `function` - Adds an "add" operation to the Evoldata stream.
    - `path`: An array of strings representing the path to the array to which the value will be appended (e.g., `["client", "logs"]`).
    - `value`: The JSON value to be added to the array at the specified path.
  - `del(path: string[])`: `function` - Adds a "delete" operation to the Evoldata stream.
    - `path`: An array of strings representing the path to the element to be deleted.
  - `close(): void`: `function` - Closes the writable stream, signaling the end of Evoldata document generation. After calling `close()`, no more events can be added.

**Sample:**

```ts
import { createEventsWritable } from "evoldata";

const { readable, set, add, del, close } = createEventsWritable();

set(["workflow", "01JBT4GF91CBPS9ZYZF7TZGTPP", "0"], {});
del(["workflow", "01JBT4GF91CBPS9ZYZF7TZGTPP", "1"]);
set(["workflow", "01JBT4GF91CBPS9ZYZF7TZGTPP", "0", "jobs"], {});
set(["workflow", "01JBT4GF91CBPS9ZYZF7TZGTPP", "0", "jobs", "2", "steps"], {});
set(
  ["workflow", "01JBT4GF91CBPS9ZYZF7TZGTPP", "0", "jobs", "2", "steps", "6"],
  {},
);
add(
  [
    "workflow",
    "01JBT4GF91CBPS9ZYZF7TZGTPP",
    "0",
    "jobs",
    "2",
    "steps",
    "6",
    "messages",
  ],
  { timestamp: 1730675231882, type: "log" },
);
set(
  ["workflow", "01JBT4GF91CBPS9ZYZF7TZGTPP", "0", "jobs", "2", "steps", "5"],
  {},
);
close();

// Consume the readable stream (example using async iterator)
(async () => {
  for await (const line of readable) {
    console.log(line);
  }
})();
// Output will be (order might vary slightly due to timestamp generation):
// 1730[CURRENT_TIMESTAMP_APPROX]	=	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.0	{}
// 1730[CURRENT_TIMESTAMP_APPROX]	-	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.1
// 1730[CURRENT_TIMESTAMP_APPROX]	=	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.0.jobs	{}
// 1730[CURRENT_TIMESTAMP_APPROX]	=	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.0.jobs.2.steps	{}
// 1730[CURRENT_TIMESTAMP_APPROX]	=	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.0.jobs.2.steps.6	{}
// 1730675231882	+	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.0.jobs.2.steps.6.messages	{"timestamp":1730675231882,"type":"log"}
// 1730[CURRENT_TIMESTAMP_APPROX]	=	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.0.jobs.2.steps.5	{}
```

### `ParsingObjectStream`

This API provides a way to parse an Evoldata document from a `ReadableStream<Uint8Array>`. It can be used in two primary ways: as a transformer stream or as an observable store.

#### As a Transformer Stream

`ParsingObjectStream` can be used with `pipeThrough` to transform a stream of `Uint8Array` chunks representing an Evoldata document into a stream that yields the parsed JavaScript object once the entire stream is processed.

**Constructor:**

- `new ParsingObjectStream()`: Creates a new `ParsingObjectStream` transformer.

**Input:**

- A `ReadableStream<Uint8Array>` providing the Evoldata document in chunks.

**Output:**

- A `ReadableStream<object>` that resolves with the parsed JavaScript object once the input stream is finished.

**Sample:**

```ts
import { ParsingObjectStream } from "evoldata";

// Assuming 'readable' is a ReadableStream<Uint8Array> with Evoldata content
const reader = readable.pipeThrough(new ParsingObjectStream()).getReader();

const { done, value } = await reader.read();
if (!done) {
  console.log(value); // => { ...parsed Evoldata object }
}
```

#### As an Observable Store

`ParsingObjectStream` also offers a static `store` method that creates an observable store. This store consumes a `ReadableStream<Uint8Array>` of Evoldata and maintains a snapshot of the parsed object, updating it as new events are processed from the stream. You can subscribe to changes in the snapshot.

**Static Method:**

- `ParsingObjectStream.store(stream: ReadableStream<Uint8Array>): Store`

  Creates an observable store that parses Evoldata from the provided stream.

  **Parameters:**

  - `stream`: `ReadableStream<Uint8Array>` - The ReadableStream providing the Evoldata document in chunks.

  **Returns:**

  - `Store`: An object with the following methods:
    - `getSnapshot(): object`: Returns the current snapshot of the parsed Evoldata object.
    - `subscribe(listener: () => void): () => void`: Subscribes a listener function to be called whenever the snapshot is updated. Returns an unsubscribe function.

**Sample:**

```ts
import { ParsingObjectStream } from "evoldata";

// Assuming 'readable' is a ReadableStream<Uint8Array> with Evoldata content
const store = ParsingObjectStream.store(readable);

console.log(store.getSnapshot()); // => Initial snapshot, might be an empty object {}

const unsubscribe = store.subscribe(() => {
  const snapshot = store.getSnapshot();
  console.log("Snapshot updated:", snapshot); // => Log the updated snapshot
});

// ... later, to stop listening for updates:
// unsubscribe();
```

## Specification of the Evoldata Document Structure

This section formally specifies the structure and syntax of an Evoldata document. Understanding this specification is crucial for correctly creating and parsing Evoldata files.

### Format

An Evoldata document is structured as a multiline text file. Each line represents a change event and follows a consistent format with four tab-separated parts:

```
{TIMESTAMP}	{OPERATION}	{PATH}	{JSON_VALUE}
```

Each line defines a single update to the data object at a specific point in time. Lines are separated by newline characters.

### Timestamp

The timestamp is a numerical value representing a specific point in time. It is expressed as the number of milliseconds that have elapsed since the [Unix epoch](https://en.wikipedia.org/wiki/Epoch) (January 1, 1970, 00:00:00 UTC). This ensures chronological ordering of events and facilitates time-based data processing.

**Examples:**

```
1730898901256  # Represents Wednesday, November 6, 2024 at 1:15:01 PM UTC
1678886400000  # Represents Thursday, March 16, 2023 00:00:00 UTC
```

### Operation

The operation defines the type of change being applied to the data at the specified path. There are now three supported operations:

- `=` **Set:** Assigns the provided `JSON_VALUE` to the location specified by the `PATH`. If a value already exists at that path, it is completely replaced with the new `JSON_VALUE`. This operation is used for setting or updating values.
- `+` **Add:** Appends the provided `JSON_VALUE` to an array located at the specified `PATH`. This operation assumes the value at the `PATH` is an array. If the path does not currently point to an array, the behavior is undefined (implementations should ideally handle this gracefully, potentially by creating an array if it doesn't exist, or throwing an error). This operation is used for adding elements to lists.
- `-` **Delete:** Deletes the value at the specified `PATH`. The `JSON_VALUE` in lines with the delete operation is ignored and can be omitted. This operation is used to remove properties from the data object.

### Path

The path is a string that specifies the location within the data structure to be updated. It uses a dot-notation syntax to represent nested objects. Each segment of the path, separated by a dot (`.`), represents a level in the object hierarchy.

**Path Components:**

- Paths are composed of segments separated by dots (`.`).
- Each segment can contain alphanumeric characters (`a-zA-Z0-9`), underscores (`_`), and numbers (`0-9`).
- Segments should ideally start with a letter, but can also start with a hyphen (`-`).
- To include special characters like dot (`.`), dollar sign (`$`), hyphen (`-`), and square brackets (`[]`) within a path segment, they must be URL-encoded during serialization and URL-decoded during deserialization.

**URL Encoding for Special Characters:**

The following URL encoding is used for special characters within path segments:

- `.` (dot) is encoded as `%46`
- `$` (dollar sign) is encoded as `%36`
- `-` (hyphen) at the beginning of a segment is encoded as `%45`
- `[]` (square brackets) are encoded as `%91%93`

**Examples:**

- `owner.name` : Accesses the `name` property of the `owner` object at the root level.
- `server.ip` : Accesses the `ip` property of the `server` object at the root level.
- `client.logs` : Accesses the `logs` property of the `client` object at the root level.
- `a.%46.b` : Represents the path `["a", ".", "b"]`.
- `a.%36.%46.b` : Represents the path `["a", "$", ".", "b"]`.
- `%45.%36.%46.%91%93` : Represents the path `["-", "$", ".", "[]"]`.
- `%45.10.%36.%46.%91%93` : Represents the path `["-", 10, "$", ".", "[]"]`.

**Note:** Paths are case-sensitive. When constructing or interpreting paths, ensure that special characters are correctly URL-encoded when serializing to the Evoldata format, and URL-decoded when parsing from the Evoldata format.
