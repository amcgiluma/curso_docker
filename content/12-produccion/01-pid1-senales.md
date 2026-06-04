---
title: "PID 1 y manejo de señales"
slug: "pid1-senales"
order: 1
summary: "Por qué el PID 1 es especial, SIGTERM, exec form, --init y tini."
---

# PID 1 y manejo de señales

Si tu contenedor tarda 10 segundos en pararse o deja procesos zombis, casi seguro tienes un problema de PID 1. Entender cómo Linux trata al proceso 1 es clave para apagados limpios en producción.

## Teoría

El primer proceso de un contenedor es el **PID 1**. En Linux, el PID 1 es especial:

- **Recibe las señales por defecto de forma distinta**: el kernel no le aplica las acciones por defecto (como terminar con `SIGTERM`) si el proceso no instala un handler. Si tu PID 1 ignora `SIGTERM`, no se enterara de que debe pararse.
- **Debe "adoptar" y recoger los procesos huerfanos** (reaping). Si no lo hace, se acumulan **zombis**.

Cuando ejecutas `docker stop`, Docker envía **SIGTERM** al PID 1 y espera (10s por defecto); si no muere, manda **SIGKILL**. Por eso un apagado limpio depende de que tu PID 1 reciba y atienda SIGTERM.

El error más común viene de la **shell form** vs **exec form** en `CMD`/`ENTRYPOINT`:

| Forma | Ejemplo | PID 1 real |
| --- | --- | --- |
| Exec form (JSON) | `CMD ["nginx", "-g", "daemon off;"]` | tu proceso (recibe señales) |
| Shell form | `CMD nginx -g "daemon off;"` | `/bin/sh -c ...`, y tu proceso es hijo |

Con shell form, el PID 1 es `sh`, que **no** reenvía SIGTERM a tu app. Resultado: `docker stop` espera 10s y mata a lo bruto.

> Nota: usa SIEMPRE la **exec form** (JSON array) en `ENTRYPOINT`/`CMD` para que tu proceso sea el PID 1 y reciba las señales.

## Manos a la obra

Compara el tiempo de parada. Con shell form, el stop tarda 10s (timeout) y termina con SIGKILL:

```compare
# CMD
docker run -d --name lento alpine sh -c "sleep 600"
docker stop lento
# OUT
lento
# (tarda ~10s: sh no propaga SIGTERM al sleep)
```

Comprueba con que código de salida murió (137 = 128 + 9 = SIGKILL):

```compare
# CMD
docker inspect --format '{{.State.ExitCode}}' lento
# OUT
137
```

Añade `--init` para que Docker inyecte un init mínimo que reenvía señales y recoge zombis:

```compare
# CMD
docker run -d --init --name rapido alpine sleep 600
docker stop rapido
# OUT
rapido
# (para casi al instante: el init propaga SIGTERM)
```

En el Dockerfile, la forma correcta es la exec form (así lo hace, por ejemplo, el backend del curso):

```dockerfile
# Exec form: uvicorn es el PID 1 y recibe SIGTERM directamente
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Flags y variantes

| Opción | Para qué sirve |
| --- | --- |
| `docker run --init` | Inyecta `tini` como PID 1 (reenvía señales, recoge zombis) |
| `docker stop -t <seg>` | Cambia el tiempo de gracia antes del SIGKILL (10s por defecto) |
| `docker kill -s <señal> <c>` | Envia una señal concreta (p. ej. `SIGHUP`) |
| `STOPSIGNAL <señal>` (Dockerfile) | Cambia la señal que Docker envía al parar |
| `ENTRYPOINT ["tini","--"]` | Usa tini como init dentro de la imagen |
| Exec form `["bin","arg"]` | Tu proceso es el PID 1 y recibe señales |
| Shell form `bin arg` | `sh -c` es el PID 1 (evítalo para procesos de larga vida) |

### tini explicito en el Dockerfile

```dockerfile
FROM alpine:3.20
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["mi-servidor"]
```

## Pruébalo tú

1. Arranca `docker run -d --name lento alpine sh -c "sleep 600"` y cronometra `docker stop lento` (tardara ~10s).
2. Revisa el código de salida con `docker inspect --format '{{.State.ExitCode}}' lento` (verás `137`).
3. Repite con `docker run -d --init --name rápido alpine sleep 600` y comprueba que `docker stop rápido` es casi instantáneo.
4. Cambia el timeout: `docker stop -t 2 lento` y observa la diferencia.
5. Reto: construye dos imágenes, una con `CMD comando` (shell form) y otra con `CMD ["comando"]` (exec form), y compara cómo responden a `docker stop`.

## Errores comunes

- **`docker stop` siempre tarda 10s**: tu PID 1 no recibe/atiende SIGTERM. Pasa a exec form o añade `--init`.
- **Exit code 137 al parar normal**: significa SIGKILL tras el timeout. No es un crash de tu app; es que no se entero del SIGTERM.
- **Procesos zombis acumulándose**: tu PID 1 no hace reaping. Usa `--init` o `tini` como entrypoint.
- **Apagado a medias (conexiones cortadas)**: tu app recibe SIGTERM pero no implementa cierre ordenado. Maneja la señal para terminar peticiones en curso antes de salir.

> Idea clave: usa la exec form para que tu proceso sea el PID 1 y reciba SIGTERM, y añade `--init`/`tini` cuando necesites reenvío de señales y recogida de zombis. Así `docker stop` apaga limpio en vez de matar a la fuerza.
