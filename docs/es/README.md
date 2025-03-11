# EVOLDATA

[English Version](../../README.md)

Este formato de archivo está diseñado para almacenar datos estructurados que evolucionan con el tiempo. Proporciona una manera flexible y eficiente de registrar cambios en las propiedades de un objeto. El formato es legible por humanos y es compatible con formatos de intercambio de datos comunes como JSON, YAML o TOML, lo que garantiza una integración perfecta con varios sistemas.

## Ejemplo

```evoldata
1730041100000	=	owner.name	"John"
1730041100000	=	owner.runOn	"Ubuntu 30.04"
1730041200000	=	server.ip	"10.0.0.1"
1730041200000	=	server.port	22
1730041300000	=	client.state	"estable"
1730041300000	=	client.pid	1000
1730041300000	+	client.logs	"Conectado al servidor."
1730041400000	=	client.delay	100
1730041500000	=	client.state	"inestable"
1730041500000	+	server.commands	"date"
1730041600000	+	client.logs	"Dom Oct 27 12:12:48 -03 2024\n"
```

## API

### `parse(payload)`

Analiza una carga útil de cadena multilínea en formato Evoldata y la transforma en un objeto JavaScript.

**Parámetros:**

- `payload`: `string` - Una cadena multilínea que contiene datos formateados en Evoldata.

**Devuelve:**

- `object` - Un objeto JavaScript que representa los datos Evoldata analizados. La estructura del objeto se construye basándose en las rutas definidas en la carga útil de Evoldata, con los valores más recientes aplicados de acuerdo con las marcas de tiempo y las operaciones.

**Ejemplo:**

```ts
import { parse } from "evoldata";

const payload = `
1730041100000	=	owner.name	"John"
1730041100000	=	owner.runOn	"Ubuntu 30.04"
1730041200000	=	server.ip	"10.0.0.1"
1730041200000	=	server.port	22
1730041300000	=	client.state	"estable"
1730041300000	=	client.pid	1000
1730041300000	+	client.logs	"Conectado al servidor."
1730041400000	=	client.delay	100
1730041500000	=	client.state	"inestable"
1730041500000	+	server.commands	"date"
1730041600000	+	client.logs	"Dom Oct 27 12:12:48 -03 2024\n"
`;

const data = parse(payload);
console.log(data);
// =>
// {
//   "client": {
//     "delay": 100,
//     "logs": [
//       "Conectado al servidor.",
//       "Dom Oct 27 12:12:48 -03 2024\n",
//     ],
//     "pid": 1000,
//     "state": "inestable",
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

Crea una interfaz de escritura para generar programáticamente un documento Evoldata. Esto es útil para crear contenido Evoldata de forma dinámica, línea por línea.

**Devuelve:**

- `object` - Un objeto que contiene métodos para interactuar con el flujo Evoldata:
  - `readable`: `ReadableStream<string>` - Un ReadableStream que produce líneas de cadena formateada en Evoldata a medida que se añaden eventos. Puede utilizar este stream para consumir el contenido Evoldata generado.
  - `set(path: string[], value: any)`: `function` - Añade una operación "set" al flujo Evoldata.
    - `path`: Un array de cadenas que representa la ruta a la propiedad que se va a establecer (por ejemplo, `["owner", "name"]`).
    - `value`: El valor JSON que se va a establecer en la ruta especificada.
  - `add(path: string[], value: any)`: `function` - Añade una operación "add" al flujo Evoldata.
    - `path`: Un array de cadenas que representa la ruta al array al que se añadirá el valor (por ejemplo, `["client", "logs"]`).
    - `value`: El valor JSON que se va a añadir al array en la ruta especificada.
  - `del(path: string[])`: `function` - Añade una operación "delete" al flujo Evoldata.
    - `path`: Un array de cadenas que representa la ruta al elemento que se va a eliminar.
  - `close(): void`: `function` - Cierra el flujo de escritura, señalando el final de la generación del documento Evoldata. Después de llamar a `close()`, no se pueden añadir más eventos.

**Ejemplo:**

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

// Consume el readable stream (ejemplo usando iterador async)
(async () => {
  for await (const line of readable) {
    console.log(line);
  }
})();
// La salida será (el orden puede variar ligeramente debido a la generación de timestamps):
// 1730[TIMESTAMP_ACTUAL_APROXIMADO]	=	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.0	{}
// 1730[TIMESTAMP_ACTUAL_APROXIMADO]	-	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.1
// 1730[TIMESTAMP_ACTUAL_APROXIMADO]	=	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.0.jobs	{}
// 1730[TIMESTAMP_ACTUAL_APROXIMADO]	=	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.0.jobs.2.steps	{}
// 1730[TIMESTAMP_ACTUAL_APROXIMADO]	=	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.0.jobs.2.steps.6	{}
// 1730675231882	+	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.0.jobs.2.steps.6.messages	{"timestamp":1730675231882,"type":"log"}
// 1730[TIMESTAMP_ACTUAL_APROXIMADO]	=	workflow.01JBT4GF91CBPS9ZYZF7TZGTPP.0.jobs.2.steps.5	{}
```

### `ParsingObjectStream`

Esta API proporciona una forma de analizar un documento Evoldata desde un `ReadableStream<Uint8Array>`. Se puede utilizar de dos maneras principales: como un stream transformador o como un almacén observable.

#### Como un Stream Transformador

`ParsingObjectStream` se puede utilizar con `pipeThrough` para transformar un stream de fragmentos `Uint8Array` que representan un documento Evoldata en un stream que produce el objeto JavaScript analizado una vez que se ha procesado todo el stream.

**Constructor:**

- `new ParsingObjectStream()`: Crea un nuevo transformador `ParsingObjectStream`.

**Entrada:**

- Un `ReadableStream<Uint8Array>` que proporciona el documento Evoldata en fragmentos.

**Salida:**

- Un `ReadableStream<object>` que se resuelve con el objeto JavaScript analizado una vez que el stream de entrada ha terminado.

**Ejemplo:**

```ts
import { ParsingObjectStream } from "evoldata";

// Asumiendo que 'readable' es un ReadableStream<Uint8Array> con contenido Evoldata
const reader = readable.pipeThrough(new ParsingObjectStream()).getReader();

const { done, value } = await reader.read();
if (!done) {
  console.log(value); // => { ...objeto Evoldata analizado }
}
```

#### Como un Almacén Observable

`ParsingObjectStream` también ofrece un método estático `store` que crea un almacén observable. Este almacén consume un `ReadableStream<Uint8Array>` de Evoldata y mantiene una instantánea del objeto analizado, actualizándola a medida que se procesan nuevos eventos desde el stream. Puede suscribirse a los cambios en la instantánea.

**Método Estático:**

- `ParsingObjectStream.store(stream: ReadableStream<Uint8Array>): Store`

  Crea un almacén observable que analiza Evoldata desde el stream proporcionado.

  **Parámetros:**

  - `stream`: `ReadableStream<Uint8Array>` - El ReadableStream que proporciona el documento Evoldata en fragmentos.

  **Devuelve:**

  - `Store`: Un objeto con los siguientes métodos:
    - `getSnapshot(): object`: Devuelve la instantánea actual del objeto Evoldata analizado.
    - `subscribe(listener: () => void): () => void`: Suscribe una función de escucha para que se llame cada vez que se actualice la instantánea. Devuelve una función para cancelar la suscripción.

**Ejemplo:**

```ts
import { ParsingObjectStream } from "evoldata";

// Asumiendo que 'readable' es un ReadableStream<Uint8Array> con contenido Evoldata
const store = ParsingObjectStream.store(readable);

console.log(store.getSnapshot()); // => Instantánea inicial, podría ser un objeto vacío {}

const unsubscribe = store.subscribe(() => {
  const snapshot = store.getSnapshot();
  console.log("Instantánea actualizada:", snapshot); // => Muestra la instantánea actualizada
});

// ... más tarde, para dejar de escuchar actualizaciones:
// unsubscribe();
```

## Especificación de la Estructura del Documento Evoldata

Esta sección especifica formalmente la estructura y sintaxis de un documento Evoldata. Comprender esta especificación es crucial para crear y analizar correctamente archivos Evoldata.

### Formato

Un documento Evoldata está estructurado como un archivo de texto multilínea. Cada línea representa un evento de cambio y sigue un formato consistente con cuatro partes separadas por tabulaciones:

```
{TIMESTAMP}	{OPERATION}	{PATH}	{JSON_VALUE}
```

Cada línea define una única actualización al objeto de datos en un punto específico en el tiempo. Las líneas están separadas por caracteres de nueva línea.

### Timestamp (Marca de Tiempo)

El timestamp es un valor numérico que representa un punto específico en el tiempo. Se expresa como el número de milisegundos que han transcurrido desde la [época Unix](https://en.wikipedia.org/wiki/Epoch) (1 de enero de 1970, 00:00:00 UTC). Esto asegura el orden cronológico de los eventos y facilita el procesamiento de datos basado en el tiempo.

**Ejemplos:**

```
1730898901256  # Representa el miércoles 6 de noviembre de 2024 a la 1:15:01 PM Tiempo Universal Coordinado
1678886400000  # Representa el jueves 16 de marzo de 2023 00:00:00 UTC
```

### Operation (Operación)

La operación define el tipo de cambio que se aplica a los datos en la ruta especificada. Ahora hay tres operaciones admitidas:

- `=` **Set (Establecer):** Asigna el `JSON_VALUE` proporcionado a la ubicación especificada por el `PATH`. Si ya existe un valor en esa ruta, se reemplaza completamente con el nuevo `JSON_VALUE`. Esta operación se utiliza para establecer o actualizar valores.
- `+` **Add (Añadir):** Añade el `JSON_VALUE` proporcionado a un array ubicado en el `PATH` especificado. Esta operación asume que el valor en el `PATH` es un array. Si la ruta no apunta actualmente a un array, el comportamiento no está definido (idealmente, las implementaciones deberían manejar esto con elegancia, potencialmente creando un array si no existe, o lanzando un error). Esta operación se utiliza para añadir elementos a listas.
- `-` **Delete (Eliminar):** Elimina el valor en el `PATH` especificado. El `JSON_VALUE` en las líneas con la operación de eliminación se ignora y puede omitirse. Esta operación se utiliza para eliminar propiedades del objeto de datos.

### Path (Ruta)

La ruta es una cadena que especifica la ubicación dentro de la estructura de datos que se va a actualizar. Utiliza una sintaxis de notación de puntos para representar objetos anidados. Cada segmento de la ruta, separado por un punto (`.`), representa un nivel en la jerarquía de objetos.

**Componentes de la Ruta:**

- Las rutas se componen de segmentos separados por puntos (`.`).
- Cada segmento puede contener caracteres alfanuméricos (`a-zA-Z0-9`), guiones bajos (`_`) y números (`0-9`).
- Idealmente, los segmentos deberían comenzar con una letra, pero también pueden comenzar con un guion (`-`).
- Para incluir caracteres especiales como punto (`.`), signo de dólar (`$`), guion (`-`) y corchetes (`[]`) dentro de un segmento de ruta, deben ser codificados en URL durante la serialización y decodificados en URL durante la deserialización.

**Codificación URL para Caracteres Especiales:**

La siguiente codificación URL se utiliza para caracteres especiales dentro de los segmentos de ruta:

- `.` (punto) se codifica como `%46`
- `$` (signo de dólar) se codifica como `%36`
- `-` (guion) al principio de un segmento se codifica como `%45`
- `[]` (corchetes) se codifican como `%91%93`

**Ejemplos:**

- `owner.name` : Accede a la propiedad `name` del objeto `owner` en el nivel raíz.
- `server.ip` : Accede a la propiedad `ip` del objeto `server` en el nivel raíz.
- `client.logs` : Accede a la propiedad `logs` del objeto `client` en el nivel raíz.
- `a.%46.b` : Representa la ruta `["a", ".", "b"]`.
- `a.%36.%46.b` : Representa la ruta `["a", "$", ".", "b"]`.
- `%45.%36.%46.%91%93` : Representa la ruta `["-", "$", ".", "[]"]`.
- `%45.10.%36.%46.%91%93` : Representa la ruta `["-", 10, "$", ".", "[]"]`.

**Nota:** Las rutas distinguen entre mayúsculas y minúsculas. Al construir o interpretar rutas, asegúrese de que los caracteres especiales estén correctamente codificados en URL al serializar al formato Evoldata, y decodificados en URL al analizar desde el formato Evoldata.
