---
title: "Radiografia del contenedor: inspect, stats y df"
slug: "inspect-stats"
order: 2
summary: "docker inspect con plantillas Go (--format), stats en vivo y df para el disco."
---

# Radiografia del contenedor: inspect, stats y df

`docker inspect` te da TODA la configuración y estado de un objeto en JSON; `docker stats` te muestra el consumo en vivo; y `docker system df` te dice cuánto disco está gastando Docker. Con estos tres tienes una radiografia completa.

## Teoría

`docker inspect` devuelve un array JSON con un volcado enorme de información: configuración, red, montajes, estado, healthcheck, etc. En vez de leerlo entero, usa **`--format`** con plantillas **Go** para extraer justo el campo que quieres.

Sintaxis básica de las plantillas:

- `{{.Campo}}` accede a un campo (respeta mayusculas, p. ej. `.State.Running`).
- `{{json .Campo}}` lo imprime como JSON.
- `{{range ...}}...{{end}}` itera sobre listas o mapas.
- `{{index .Lista 0}}` accede a un elemento concreto.

| Comando | Te dice |
| --- | --- |
| `docker inspect` | Configuración y estado completos (JSON) |
| `docker stats` | CPU, memoria, red y I/O en tiempo real |
| `docker system df` | Espacio usado por imágenes, contenedores, volúmenes y cache |

> Nota: `docker inspect` sirve para casi cualquier objeto: contenedores, imágenes, volúmenes, redes. Detecta el tipo, o puedes forzarlo con `--type`.

## Manos a la obra

Extrae campos concretos del estado con `--format` en vez de leer todo el JSON:

```compare
# CMD
docker run -d --name web nginx:1.27-alpine
docker inspect --format '{{.State.Status}} pid={{.State.Pid}}' web
# OUT
running pid=20144
```

Saca la IP del contenedor recorriendo sus redes:

```compare
# CMD
docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web
# OUT
172.17.0.2
```

Mira el consumo de recursos en vivo (sin streaming continuo con `--no-stream`):

```compare
# CMD
docker stats --no-stream web
# OUT
CONTAINER ID   NAME   CPU %   MEM USAGE / LIMIT   MEM %   NET I/O      BLOCK I/O   PIDS
20144abf3c11   web    0.00%   3.512MiB / 7.6GiB   0.05%   1.1kB / 0B   0B / 0B     3
```

Revisa cuánto disco está usando Docker y cuánto es reclamable:

```compare
# CMD
docker system df
# OUT
TYPE            TOTAL   ACTIVE   SIZE      RECLAIMABLE
Images          12      4        2.341GB   1.802GB (76%)
Containers      6       2        12.4MB    11.8MB (95%)
Local Volumes   3       1        148.2MB   96.4MB (65%)
Build Cache     34      0        612.5MB   612.5MB (100%)
```

## Flags y variantes

### `docker inspect`

| Flag / plantilla | Para qué sirve |
| --- | --- |
| `--format '{{.State.Running}}'` | Extrae un campo concreto |
| `--format '{{json .Config.Env}}'` | Imprime un campo como JSON |
| `--type container\|image\|volume\|network` | Fuerza el tipo de objeto |
| `-s`, `--size` | Añade el tamaño de la capa de escritura (contenedores) |
| `{{range .Mounts}}{{.Source}}->{{.Destination}}{{end}}` | Lista los montajes |

### `docker stats`

| Flag | Para qué sirve |
| --- | --- |
| `--no-stream` | Una sola captura en vez de refresco continuo |
| `--all`, `-a` | Incluye también contenedores parados |
| `--format` | Personaliza columnas, p. ej. `'{{.Name}}: {{.MemUsage}}'` |

### `docker system df`

| Flag | Para qué sirve |
| --- | --- |
| `-v`, `--verbose` | Desglose objeto por objeto |
| (combinar con) `docker system prune` | Reclama el espacio marcado como reclaimable |

## Pruébalo tú

1. Arranca `docker run -d --name web nginx:1.27-alpine`.
2. Saca solo el estado: `docker inspect --format '{{.State.Status}}' web`.
3. Obten la IP: `docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web`.
4. Lista variables de entorno como JSON: `docker inspect --format '{{json .Config.Env}}' web`.
5. Mira recursos con `docker stats --no-stream` y luego en vivo con `docker stats` (sal con `Ctrl+C`).
6. Reto: ejecuta `docker system df -v` y localiza la imagen más grande; después prueba `docker system df` antes y después de un `docker image prune`.

## Errores comunes

- **`Template parsing error`**: nombre de campo mal escrito o sin respetar mayusculas. Es `.State.Running`, no `.state.running`. Mira primero el JSON completo para acertar con la ruta.
- **`docker stats` parece colgado**: es normal, refresca en bucle. Usa `--no-stream` para una sola lectura en scripts.
- **`MEM USAGE / LIMIT` muestra toda la RAM del host**: si no pusiste `--memory`, el límite es el del host. Define límites para ver porcentajes útiles.
- **El disco no baja tras borrar imágenes**: el espacio puede estar en volúmenes o build cache. Mira `docker system df -v` y usa el prune adecuado.

> Idea clave: `docker inspect --format` con plantillas Go te da exactamente el dato que buscas sin leer todo el JSON; `docker stats` mide el consumo en vivo y `docker system df` te dice donde se va el disco.
