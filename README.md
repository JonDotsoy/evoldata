# EVOLDATA

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

### Parse multiline payload

**Sample:**

```ts
import { parse } from "evoldata";

parse(payload);
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

The operation defines the type of change being applied to the data at the specified path. There are two supported operations:

- `=` **Set:** Assigns the provided `JSON_VALUE` to the location specified by the `PATH`. If a value already exists at that path, it is completely replaced with the new `JSON_VALUE`. This operation is used for setting or updating values.
- `+` **Add:** Appends the provided `JSON_VALUE` to an array located at the specified `PATH`. This operation assumes the value at the `PATH` is an array. If the path does not currently point to an array, the behavior is undefined (implementations should ideally handle this gracefully, potentially by creating an array if it doesn't exist, or throwing an error). This operation is used for adding elements to lists.

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
