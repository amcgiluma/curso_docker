---
title: "Healthchecks y restart policies"
slug: "healthchecks-restart"
order: 2
summary: "HEALTHCHECK en el Dockerfile y políticas de reinicio para resiliencia."
---

# Healthchecks y restart policies

Un contenedor "en marcha" no significa "funcionando". Los **healthchecks** distinguen entre vivo y sano; las **restart policies** deciden que pasa cuando algo se cae. Juntos dan resiliencia a tu stack.

## Teoría

### Healthcheck

Un `HEALTHCHECK` es un comando que Docker ejecuta periódicamente **dentro** del contenedor. Según su código de salida, marca el estado:

| Exit code del check | Estado |
| --- | --- |
| `0` | `healthy` |
| `1` | `unhealthy` |
| `2` | reservado (no usar) |

El estado pasa por `starting` durante el `start-period` (los fallos ahí no cuentan), y luego oscila entre `healthy` y `unhealthy`. Esto permite a Compose y a los orquestadores **esperar** a que un servicio esté sano antes de arrancar otro (`depends_on: condition: service_healthy`).

### Restart policies

Una **restart policy** le dice a Docker qué hacer cuando el contenedor se detiene:

| Política | Comportamiento |
| --- | --- |
| `no` | No reiniciar (por defecto) |
| `on-failure[:N]` | Reinicia solo si sale con código != 0 (opcional, hasta N veces) |
| `always` | Reinicia siempre; también al arrancar el daemon |
| `unless-stopped` | Como `always`, pero respeta una parada manual |

> Nota importante: por defecto la restart policy mira el **código de salida**, no la salud. Un contenedor `unhealthy` que sigue "running" NO se reinicia solo en Docker plano; eso lo hacen Swarm/Kubernetes. El healthcheck por si solo informa, no reinicia.

## Manos a la obra

Define un healthcheck en el Dockerfile (estilo del frontend del curso, que comprueba que nginx responde):

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost:80/ || exit 1
```

Observa cómo el estado pasa de `starting` a `healthy`:

```compare
# CMD
docker run -d --name web nginx:1.27-alpine \
  --health-cmd="wget --spider -q http://localhost/ || exit 1" \
  --health-interval=5s
docker ps --format '{{.Names}} {{.Status}}'
# OUT
web Up 3 seconds (health: starting)
# (tras unos segundos)
web Up 20 seconds (healthy)
```

Combina restart policy y comprueba que un contenedor que falla se reinicia:

```compare
# CMD
docker run -d --name flaky --restart on-failure:3 \
  alpine sh -c "sleep 3; exit 1"
sleep 12
docker inspect --format 'restarts={{.RestartCount}} status={{.State.Status}}' flaky
# OUT
restarts=3 status=exited
# (reintenta 3 veces y se rinde)
```

Mira el detalle de las últimas comprobaciones de salud:

```compare
# CMD
docker inspect --format '{{json .State.Health}}' web
# OUT
{"Status":"healthy","FailingStreak":0,"Log":[{"ExitCode":0,"Output":"..."}]}
```

## Flags y variantes

### Healthcheck (Dockerfile y `docker run`)

| Opción | Para qué sirve |
| --- | --- |
| `--interval=30s` | Cada cuánto se ejecuta el check |
| `--timeout=5s` | Cuánto espera antes de considerar fallido el check |
| `--start-period=10s` | Periodo de gracia inicial (los fallos no cuentan) |
| `--retries=3` | Fallos consecutivos para pasar a `unhealthy` |
| `HEALTHCHECK NONE` | Desactiva un healthcheck heredado de la imagen base |
| `docker run --no-healthcheck` | Arranca ignorando el healthcheck de la imagen |

### Restart policy

| Opción | Para qué sirve |
| --- | --- |
| `--restart no` | Sin reinicio (por defecto) |
| `--restart on-failure:5` | Reinicia hasta 5 veces si sale con error |
| `--restart always` | Reinicia siempre (incluido al arrancar Docker) |
| `--restart unless-stopped` | Como `always` salvo que lo pares tú |
| `docker update --restart <pol> <c>` | Cambia la política de un contenedor existente |

> Nota: en Compose se escribe `restart: unless-stopped` (formato corto) o, para Swarm, `deploy.restart_policy` con `condition`/`max_attempts`.

## Pruébalo tú

1. Arranca nginx con healthcheck: `docker run -d --name web --health-cmd="wget --spider -q http://localhost/ || exit 1" --health-interval=5s nginx:1.27-alpine`.
2. Ejecuta `docker ps` repetidas veces y observa el paso de `health: starting` a `healthy`.
3. Mira el log de salud con `docker inspect --format '{{json .State.Health}}' web`.
4. Prueba un fallo: `docker run -d --name flaky --restart on-failure:3 alpine sh -c "sleep 3; exit 1"` y revisa `RestartCount` con `docker inspect`.
5. Compara con `--restart no`: el contenedor queda `exited` sin reintentos.
6. Reto: rompe a propósito el healthcheck (`--health-cmd="exit 1"`) y comprueba que el estado pasa a `unhealthy` pero el contenedor sigue `running` (Docker plano no lo reinicia por salud).

## Errores comunes

- **El healthcheck siempre `unhealthy`**: el comando no existe en la imagen (p. ej. `curl` en Alpine) o la app aún no escucha. Usa `wget`/herramienta presente y ajusta `start-period`.
- **Esperar que `unhealthy` reinicie el contenedor**: en Docker plano no ocurre; la restart policy mira el exit code. Para reinicio por salud usa Swarm/Kubernetes o un proceso supervisor.
- **`--restart always` que no para de reiniciar un crash-loop**: si la app falla al instante, entra en bucle. Arregla la causa o usa `on-failure:N` para limitar reintentos.
- **`depends_on` no espera a la salud**: necesitas `condition: service_healthy` y un healthcheck definido; el `depends_on` simple solo espera a que arranque, no a qué esté sano.

> Idea clave: el `HEALTHCHECK` informa de si la app realmente funciona (vivo != sano) y habilita `depends_on: service_healthy`; las restart policies (`on-failure`, `always`, `unless-stopped`) dan resiliencia ante caídas, pero reaccionan al exit code, no a la salud.
