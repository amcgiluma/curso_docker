---
title: "Ver que pasa: logs y events"
slug: "logs-events"
order: 1
summary: "docker logs (--follow, --tail, --since) y docker events para auditar el daemon."
---

# Ver que pasa: logs y events

Cuando algo falla, lo primero es mirar la salida del contenedor y los eventos del daemon. `docker logs` te muestra lo que escribe tu app; `docker events` te muestra qué está haciendo Docker por dentro.

## Teoría

Docker captura lo que tu proceso escribe en **stdout** y **stderr** y lo guarda a través de un *logging driver* (por defecto `json-file`). `docker logs` lee esos registros.

Regla de oro: **tu aplicación debe loggear a stdout/stderr**, no a ficheros dentro del contenedor. Así Docker (y cualquier orquestador) puede recoger los logs sin que tengas que entrar al contenedor.

| Stream | Tipico para |
| --- | --- |
| `stdout` | Logs normales de la aplicación |
| `stderr` | Errores y avisos |

`docker events` es distinto: es un flujo en tiempo real de lo que ocurre en el **daemon** (contenedores que arrancan/paran, imágenes que se bajan, volúmenes creados, healthchecks...). Es ideal para auditar o entender por qué un contenedor se reinicio.

> Nota: `docker logs` solo funciona con los drivers `json-file` y `local`. Si usas un driver remoto (p. ej. `syslog`, `gelf`), el comando devuelve un error porque los logs no están en el host.

## Manos a la obra

Arranca algo que genere salida continua y siguela en vivo:

```compare
# CMD
docker run -d --name pinger alpine sh -c "while true; do echo ping \$(date +%T); sleep 1; done"
docker logs --tail 3 --follow pinger
# OUT
ping 18:04:21
ping 18:04:22
ping 18:04:23
# (sigue en vivo; Ctrl+C para salir)
```

Muestra solo lo ocurrido en los últimos 30 segundos y con marca de tiempo:

```compare
# CMD
docker logs --since 30s --timestamps pinger
# OUT
2026-06-01T18:04:50.512Z ping 18:04:50
2026-06-01T18:04:51.515Z ping 18:04:51
2026-06-01T18:04:52.517Z ping 18:04:52
```

En otra terminal, observa los eventos del daemon mientras paras el contenedor:

```compare
# CMD
docker events --filter container=pinger
# OUT
2026-06-01T18:05:10 container kill pinger (signal=15)
2026-06-01T18:05:10 container die pinger (exitCode=137)
2026-06-01T18:05:10 container stop pinger
```

## Flags y variantes

### `docker logs`

| Flag | Para qué sirve |
| --- | --- |
| `-f`, `--follow` | Sigue la salida en tiempo real (como `tail -f`) |
| `--tail <n>` | Muestra solo las últimas `n` líneas (`all` por defecto) |
| `--since <t>` | Logs desde un instante: `30s`, `2025-06-01T18:00:00` |
| `--until <t>` | Logs hasta un instante dado |
| `-t`, `--timestamps` | Añade marca de tiempo a cada línea |
| `--details` | Muestra metadatos extra del driver |
| `-n` | Alias corto de `--tail` |

### `docker events`

| Flag | Para qué sirve |
| --- | --- |
| `--filter container=<nombre>` | Solo eventos de ese contenedor |
| `--filter type=<tipo>` | `container`, `image`, `volume`, `network`, ... |
| `--filter event=<acción>` | `start`, `stop`, `die`, `health_status`, ... |
| `--since` / `--until` | Acota la ventana temporal de eventos |
| `--format '{{json .}}'` | Salida en JSON para procesar con scripts |

## Pruébalo tú

1. Lanza el contenedor `pinger` del ejemplo.
2. Ejecuta `docker logs --tail 5 pinger` y luego `docker logs -f pinger` (sal con `Ctrl+C`; el contenedor sigue vivo).
3. Prueba `docker logs --since 10s pinger` y `docker logs --timestamps pinger`.
4. En una segúnda terminal, abre `docker events --filter container=pinger`.
5. Para el contenedor con `docker stop pinger` y mira los eventos `kill`, `die` y `stop`.
6. Reto: arranca un contenedor con `HEALTHCHECK` y filtra `docker events --filter event=health_status` para ver las transiciones de salud.

## Errores comunes

- **`docker logs` no muestra nada**: tu app loggea a un fichero dentro del contenedor, no a stdout/stderr. Redirige los logs a la salida estándar.
- **`Error: configured logging driver does not support reading`**: estás usando un driver remoto. Consulta los logs en el destino (syslog, ELK...) o cambia a `json-file`/`local` para depurar.
- **Los logs crecen sin límite**: con `json-file` sin rotación, el JSON ocupa todo el disco. Configura `max-size`/`max-file` (lo vemos en el módulo de producción).
- **Confundir `logs` con `events`**: `logs` es la salida de tu app; `events` es lo que hace el daemon. Para "por qué se reinicio" mira `events` y `docker inspect`.

> Idea clave: tu app debe escribir a stdout/stderr para que `docker logs` la capture; combina `--follow`, `--tail` y `--since` para acotar. `docker events` te da el flujo de acciones del daemon, perfecto para entender arranques, paradas y cambios de salud.
