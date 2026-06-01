---
title: "Cache de capas, orden de instrucciones y .dockerignore"
slug: "cache-y-dockerignore"
order: 5
summary: "Aprovechar la cache de build ordenando bien las instrucciones y limpiando el contexto."
---

# Cache de capas, orden de instrucciones y .dockerignore

La diferencia entre un build de 2 segundos y uno de 5 minutos suele estar en el **orden** de las instrucciones y en un buen **`.dockerignore`**. Aqui aprendes a que la cache trabaje a tu favor.

## Teoria

### Como funciona la cache

BuildKit cachea cada capa. Para reutilizar una capa, comprueba si la instruccion **y sus entradas** son identicas a una construccion previa:

- En `RUN`, la "entrada" es el texto del comando.
- En `COPY`/`ADD`, la entrada es el **contenido** de los ficheros copiados (su checksum).

Regla de oro: **en cuanto una instruccion invalida la cache, todas las siguientes se reconstruyen**. Por eso conviene poner lo que cambia poco arriba y lo que cambia mucho abajo.

### El patron clave: dependencias antes que codigo

Copiar primero el manifiesto de dependencias e instalarlas, y solo despues copiar el codigo, hace que un cambio en el codigo **no** reinstale dependencias:

```dockerfile
# MAL: cualquier cambio de codigo reinstala dependencias
COPY . .
RUN npm install

# BIEN: install se cachea mientras package*.json no cambie
COPY package*.json ./
RUN npm install
COPY . .
```

### `.dockerignore`

Excluye del **contexto** ficheros que no deben enviarse al daemon ni acabar en la imagen (`node_modules`, `.git`, logs, secretos). Ademas de acelerar, evita invalidar la cache de `COPY . .` por cambios irrelevantes.

> Doble beneficio: un `.dockerignore` cuidado reduce el contexto (build mas rapido) y estabiliza la cache (menos invalidaciones por ficheros que no importan).

## Manos a la obra

Compara el orden bueno y el malo. Primer build llena la cache; al cambiar solo el codigo, el bueno reutiliza la capa de dependencias:

```compare
# CMD
docker build -t app:cache .
# (editas un fichero de codigo, no package.json)
docker build -t app:cache .
# OUT
 => [2/4] COPY package*.json ./                         CACHED
 => [3/4] RUN npm install                               CACHED
 => [4/4] COPY . .                                      0.2s
 => exporting to image                                  0.3s
```

Las lineas `CACHED` confirman que no se reinstalaron dependencias. Si hubieras hecho `COPY . .` antes del install, verias el `RUN npm install` ejecutarse de nuevo.

Crea un `.dockerignore` y observa como cae el tamano del contexto:

```dockerfile
node_modules
.git
*.log
dist
.env
```

```compare
# CMD
docker build -t app:slim .
# OUT
 => [internal] load .dockerignore                       0.0s
 => => transferring context: 312B                       0.0s
 => [internal] load build context                       0.0s
 => => transferring context: 18.4kB                     0.0s
# (antes del .dockerignore el contexto eran varios MB por node_modules)
```

Fuerza un rebuild completo cuando lo necesites con `--no-cache`:

```compare
# CMD
docker build --no-cache -t app:fresh .
# OUT
 => [2/4] COPY package*.json ./                         0.1s
 => [3/4] RUN npm install                               14.7s
 => [4/4] COPY . .                                      0.2s
```

## Flags y variantes

| Elemento | Opcion | Para que sirve |
| --- | --- | --- |
| `docker build` | `--no-cache` | Ignora toda la cache |
| `docker build` | `--pull` | Refresca la imagen base |
| `docker build` | `--progress=plain` | Ver que pasos salen `CACHED` |
| `.dockerignore` | `node_modules` | Excluye dependencias locales |
| `.dockerignore` | `**/*.log` | Patrones glob recursivos |
| `.dockerignore` | `!keep.txt` | Excepcion: vuelve a incluir un fichero |
| Dockerfile | `COPY package*.json ./` antes que el codigo | Maximiza el cache de dependencias |
| Dockerfile | `RUN --mount=type=cache,...` | Cache persistente entre builds (BuildKit) |

## Pruebalo tu

1. Crea un proyecto con `package.json` y un `Dockerfile` con el **orden bueno**.
2. Construye dos veces sin cambiar nada y confirma que el segundo build sale casi todo `CACHED`.
3. Edita solo un fichero de codigo y reconstruye: el `RUN npm install` debe seguir `CACHED`.
4. Ahora invierte el orden (`COPY . .` antes del install) y repite: veras como se reinstala todo.
5. Anade un `.dockerignore` con `node_modules` y compara "transferring context" antes y despues.

## Errores comunes

- **`COPY . .` demasiado pronto**: invalida la cache de las dependencias en cada cambio de codigo. Copia primero los manifiestos.
- **Sin `.dockerignore`**: envias `node_modules`/`.git` al daemon; build lento y cache fragil. Anádelo siempre.
- **Esperar cache tras cambiar un `RUN`**: cambiar una sola letra del comando invalida esa capa y las siguientes.
- **`--no-cache` por costumbre**: a veces se abusa de el "por si acaso"; ralentiza todo. Usalo solo cuando de verdad quieras un build limpio.
- **Secretos en el contexto**: si no ignoras `.env`, puede acabar en la imagen via `COPY . .`. Anádelo a `.dockerignore`.

> Idea clave: la cache se invalida en cascada desde la primera instruccion que cambia. Pon lo estable arriba (copiar manifiestos + instalar dependencias) y el codigo volatil abajo, y usa `.dockerignore` para acelerar el build y estabilizar la cache.
