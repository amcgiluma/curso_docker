---
title: "Ciclo de vida de un contenedor"
slug: "ciclo-de-vida"
order: 1
summary: "Estados y transiciones: create, start, stop, restart, kill y rm."
---

# Ciclo de vida de un contenedor

Un contenedor pasa por estados bien definidos (creado, en ejecución, parado, salido). Saber que comando provoca cada transición te evita sorpresas cómo "no puedo borrarlo" o "se quedo zombie".

## Teoría

Estados principales y cómo se llega a ellos:

| Estado | Significado | Cómo se llega |
| --- | --- | --- |
| `created` | Existe pero nunca arranco | `docker create` |
| `running` | El proceso principal está vivo | `docker start` / `docker run` |
| `paused` | Procesos congelados (cgroup freezer) | `docker pause` |
| `exited` | El proceso termino (con un código de salida) | fin del proceso, `docker stop`, `docker kill` |
| `dead` | Estado inconsistente tras un fallo de borrado | poco frecuente |

Diferencias que conviene tener claras:

- `docker run` = `docker create` + `docker start` (crea **y** arranca).
- **stop** envía `SIGTERM` y, si no muere en el plazo de gracia (10 s por defecto), `SIGKILL`. Es un apagado "educado".
- **kill** envía directamente `SIGKILL` (o la señal que indiques). Es inmediato y brusco.
- **restart** = stop + start.
- Un contenedor `exited` **sigue existiendo** (ocupa su capa de escritura) hasta qué haces `rm`.

> El código de salida importa: `0` = todo bien, `137` = SIGKILL (128+9), `143` = SIGTERM (128+15), `139` = SIGSEGV. Lo ves en `docker ps -a` y en `docker inspect`.

## Manos a la obra

Crea sin arrancar, luego arranca, y observa el cambio de estado:

```compare
# CMD
docker create --name web nginx:alpine
docker ps -a --filter name=web --format "{{.Names}} {{.Status}}"
# OUT
<container-id>
web Created
```

```compare
# CMD
docker start web
docker ps --filter name=web --format "{{.Names}} {{.Status}}"
# OUT
web
web Up 2 seconds
```

Para con gracia y comprueba el código de salida:

```compare
# CMD
docker stop web
docker inspect --format '{{.State.Status}} (exit {{.State.ExitCode}})' web
# OUT
web
exited (exit 0)
```

Compara stop (limpio) con kill (brusco). Aquí el proceso recibe SIGKILL -> código 137:

```compare
# CMD
docker start web
docker kill web
docker inspect --format '{{.State.ExitCode}}' web
# OUT
web
web
137
```

Finalmente elimina el contenedor:

```compare
# CMD
docker rm web
# OUT
web
```

## Flags y variantes

| Comando | Flags útiles | Para qué sirve |
| --- | --- | --- |
| `docker create` | `--name`, `-it`, `-p` | Crea sin arrancar |
| `docker start` | `-a` (adjuntar), `-i` (interactivo) | Arranca un contenedor parado |
| `docker stop` | `-t <seg>` | Para con SIGTERM y plazo de gracia |
| `docker restart` | `-t <seg>` | Reinicia (stop + start) |
| `docker kill` | `-s <SENAL>` (ej. `-s SIGINT`) | Envia una señal de inmediato |
| `docker pause` / `unpause` | — | Congela / descongela los procesos |
| `docker rm` | `-f` (forzar), `-v` (borrar volúmenes anónimos) | Elimina el contenedor |
| `docker wait` | — | Bloquea hasta que el contenedor para y muestra su código |

## Pruébalo tú

1. Haz `docker create --name web nginx:alpine` y confirma con `docker ps -a` que aparece como `Created`.
2. Arráncalo con `docker start web` y verifica que pasa a `Up`.
3. Detenlo con `docker stop web` (mira cuánto tarda) y luego prueba `docker kill web` tras volver a arrancarlo: nota qué es instantáneo.
4. Lanza `docker inspect --format '{{.State.ExitCode}}' web` y razona el código según cómo lo paraste.
5. Borralo con `docker rm web`. Intenta `rm` sobre uno en marcha y verás que necesita `-f`.

## Errores comunes

- **`You cannot remove a running container ... Stop the container before attempting removal or force remove`**: paralo antes o usa `docker rm -f`.
- **"docker stop tarda 10 segundos"**: tu app no maneja `SIGTERM`; arregla el manejo de señales o baja el plazo con `-t`.
- **Código de salida 137 inesperado**: lo mato un `SIGKILL`, a menudo por `docker stop` que agoto la gracia o por un OOM.
- **Contenedores `exited` acumulados**: ocupan espacio; limpialos con `docker rm` o usa `--rm` al ejecutar.

> Idea clave: `run` = `create` + `start`. `stop` es educado (SIGTERM y luego SIGKILL), `kill` es inmediato (SIGKILL). Un contenedor `exited` sigue existiendo hasta qué haces `rm`.
