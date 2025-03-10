# EVOLDATA

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

### Parsear payload multilinea

**Ejemplo:**

```ts
import { parse } from "evoldata";

parse(payload);
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

La operación define el tipo de cambio que se aplica a los datos en la ruta especificada. Hay dos operaciones admitidas:

- `=` **Set (Establecer):** Asigna el `JSON_VALUE` proporcionado a la ubicación especificada por el `PATH`. Si ya existe un valor en esa ruta, se reemplaza completamente con el nuevo `JSON_VALUE`. Esta operación se utiliza para establecer o actualizar valores.
- `+` **Add (Añadir):** Añade el `JSON_VALUE` proporcionado a un array ubicado en el `PATH` especificado. Esta operación asume que el valor en el `PATH` es un array. Si la ruta no apunta actualmente a un array, el comportamiento no está definido (idealmente, las implementaciones deberían manejar esto con elegancia, potencialmente creando un array si no existe, o lanzando un error). Esta operación se utiliza para añadir elementos a listas.

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
