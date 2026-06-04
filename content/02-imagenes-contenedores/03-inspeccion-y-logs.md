---
title: "Inspección, logs y metricas"
slug: "inspeccion-y-logs"
order: 3
summary: "ps con filtros y formato, inspect, logs, stats, top y port."
---

# Inspección, logs y metricas

Cuando algo va mal, estos comandos son tus ojos: qué contenedores hay (`ps`), qué dice la app (`logs`), cómo está configurado (`inspect`), cuánto consume (`stats`) y qué procesos corre (`top`).

## Teoría

- **`docker ps`** lista contenedores. Por defecto solo los `running`; con `-a` ves todos. Acepta `--filter` para acotar y `--format` para personalizar columnas con plantillas Go.
- **`docker inspect`** devuelve un JSON enorme con toda la config y estado. Usa `--format` para extraer solo lo que te interesa (red, mounts, env, salud...).
- **`docker logs`** muestra el STDOUT/STDERR del proceso principal. Solo funciona bien si tu app escribe a stdout/stderr (la práctica recomendada), no a un fichero interno.
- **`docker stats`** da metricas en vivo (CPU, RAM, red, I/O). Es un stream; con `--no-stream` saca una sola foto.
- **`docker top`** lista los procesos del contenedor vistos desde el host.
- **`docker port`** muestra el mapeo de puertos publicados.

> Truco de formato: las plantillas Go usan campos como `{{.Names}}`, `{{.Status}}`, `{{.Image}}`. Con `--format "table ..."` añades cabecera; sin `table`, solo los valores.

## Manos a la obra

Lista con filtro y formato a medida:

```compare
# CMD
docker run -d --name web -p 8080:80 nginx:alpine
docker ps --filter "name=web" --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
# OUT
<container-id>
NAMES   IMAGE          PORTS
web     nginx:alpine   0.0.0.0:8080->80/tcp
```

Extrae solo la IP del contenedor con inspect + format:

```compare
# CMD
docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web
# OUT
172.17.0.2
# (la IP varía según tu entorno)
```

Logs: las últimas líneas y luego en seguimiento:

```compare
# CMD
docker logs --tail 3 web
# OUT
... [notice] 1#1: start worker processes
... [notice] 1#1: start worker process 30
... [notice] 1#1: start worker process 31
```

Metricas puntuales sin stream:

```compare
# CMD
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" web
# OUT
NAME   CPU %     MEM USAGE / LIMIT
web    0.00%     3.1MiB / 7.6GiB
# (los valores varian)
```

Procesos del contenedor y mapeo de puertos:

```compare
# CMD
docker top web
docker port web
# OUT
UID    PID    PPID   C   STIME   TTY   TIME       CMD
root   2451   2430   0   10:12   ?     00:00:00   nginx: master process nginx -g daemon off;
...
80/tcp -> 0.0.0.0:8080
```

## Flags y variantes

| Comando | Flag | Para qué sirve |
| --- | --- | --- |
| `docker ps` | `-a` | Incluye contenedores parados |
| `docker ps` | `-q` | Solo los IDs (útil para scripting) |
| `docker ps` | `-s` | Añade el tamaño (capa de escritura) |
| `docker ps` | `-n <N>` | Los últimos N contenedores creados |
| `docker ps` | `--filter "status=exited"` | Filtra por estado, nombre, label, etc. |
| `docker ps` | `--format "table ..."` | Columnas a medida con plantillas Go |
| `docker inspect` | `--format '{{...}}'` | Extrae campos concretos del JSON |
| `docker inspect` | `--type container\|image` | Fuerza el tipo de objeto |
| `docker logs` | `-f` | Sigue en tiempo real (como `tail -f`) |
| `docker logs` | `--tail <N>` | Ultimás N líneas |
| `docker logs` | `--since`, `--until` | Filtra por tiempo (ej. `--since 10m`) |
| `docker logs` | `-t` | Añade marcas de tiempo |
| `docker stats` | `--no-stream` | Una sola lectura, no en streaming |
| `docker stats` | `--format "..."` | Columnas a medida |
| `docker top` | (args de ps) | `docker top web -eo pid,comm` |
| `docker port` | `<puerto>` | Consulta el mapeo de un puerto concreto |

## Pruébalo tú

1. Arranca `docker run -d --name web -p 8080:80 nginx:alpine`.
2. Lista solo nombre, imagen y puertos con `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"`.
3. Genera trafico con `curl localhost:8080` y observa `docker logs -f web` en otra terminal.
4. Saca una foto de consumo con `docker stats --no-stream web`.
5. Extrae la IP con el `inspect --format` del ejemplo y haz `ping` desde otro contenedor en la misma red.

## Errores comunes

- **`docker logs` no muestra nada**: la app escribe en un fichero, no a stdout/stderr. Reconfigurala para loguear a la consola.
- **`docker ps` "no muestra mi contenedor"**: ya termino; usa `docker ps -a`.
- **Plantilla `--format` rota**: ojo a las mayusculas y los puntos (`{{.Names}}`, no `{{.name}}`); un campo inexistente da `<no value>`.
- **`docker stats` se queda "colgado"**: es normal, es un stream; usa `--no-stream` o sal con `Ctrl+C`.

> Idea clave: `ps` (que hay) + `logs` (qué dice) + `inspect` (cómo está configurado) + `stats`/`top` (que consume) son tu kit de diagnóstico. Domina `--filter` y `--format` para extraer justo lo que necesitas.
