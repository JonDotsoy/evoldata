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
