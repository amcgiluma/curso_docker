---
title: "Servicios, build y dependencias"
slug: "servicios-build-deps"
order: 2
summary: "Definir services, build con context/target/args, depends_on con condition y healthcheck."
---

# Servicios, build y dependencias

Un servicio puede usar una imagen ya publicada o **construirse** desde un Dockerfile. Ademas puedes controlar el **orden de arranque** con `depends_on` y, combinado con `healthcheck`, esperar a que una dependencia este realmente lista.

## Teoria

Cada entrada de `services` describe un contenedor. Las claves mas usadas:

- **`image`**: imagen a usar (o nombre que tendra la imagen construida).
- **`build`**: construye la imagen localmente. Puede ser una ruta corta o un bloque con `context`, `dockerfile`, `target` (etapa del multi-stage) y `args` (argumentos de build).
- **`depends_on`**: orden de arranque. En su forma simple solo garantiza que el contenedor dependiente **arranca** antes; NO espera a que el servicio este "listo".
- **`healthcheck`**: define como Docker comprueba la salud del contenedor. Combinado con `depends_on: condition: service_healthy`, Compose espera a que la dependencia este sana.

Estados de salud: `starting` (durante `start_period`), `healthy` o `unhealthy`.

> `depends_on` sin `condition` controla orden, no disponibilidad. Una base de datos puede estar "arrancada" pero todavia no aceptar conexiones; por eso conviene `service_healthy`.

## Manos a la obra

Un servicio que se construye y depende de una BBDD sana:

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
      args:
        APP_VERSION: "1.2.0"
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ejemplo
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

Levanta y observa que `api` espera a que `db` este `healthy`:

```compare
# CMD
docker compose up -d
# OUT
[+] Running 3/3
 ✔ Network proyecto_default  Created
 ✔ Container proyecto-db-1   Healthy
 ✔ Container proyecto-api-1  Started
```

Comprueba el estado de salud:

```compare
# CMD
docker compose ps
# OUT
NAME              IMAGE                SERVICE   STATUS                   PORTS
proyecto-api-1    proyecto-api         api       Up 5 seconds             0.0.0.0:3000->3000/tcp
proyecto-db-1     postgres:16-alpine   db        Up 20 seconds (healthy)  5432/tcp
```

## Flags y variantes

| Clave / opcion | Que hace |
| --- | --- |
| `build: .` | Construye usando el Dockerfile del directorio actual |
| `build.context` | Directorio de contexto de build |
| `build.dockerfile` | Nombre/ruta del Dockerfile |
| `build.target` | Etapa concreta de un multi-stage build |
| `build.args` | Variables `ARG` pasadas al build |
| `image` (con `build`) | Nombre y etiqueta de la imagen resultante |
| `depends_on: [db]` | Forma corta: solo ordena el arranque |
| `depends_on.<svc>.condition: service_started` | Espera a que el contenedor arranque |
| `depends_on.<svc>.condition: service_healthy` | Espera a que el healthcheck pase |
| `depends_on.<svc>.condition: service_completed_successfully` | Espera a que termine OK (jobs) |
| `healthcheck.test` | Comando de comprobacion (`CMD` o `CMD-SHELL`) |
| `healthcheck.interval/timeout/retries/start_period` | Ritmo y margen del chequeo |
| `healthcheck.disable: true` | Desactiva el healthcheck heredado de la imagen |

## Pruebalo tu

1. Crea un `compose.yaml` con un servicio `db` (postgres) que tenga el `healthcheck` del ejemplo.
2. Anade un servicio `api` con `depends_on: db: condition: service_healthy` (puedes usar `image: alpine` y `command: ["sh","-c","echo arrancado && sleep 3600"]` para probar).
3. Ejecuta `docker compose up -d` y observa el orden: `db` aparece `Healthy` antes de arrancar `api`.
4. Mira el estado con `docker compose ps` (la columna STATUS muestra `(healthy)`).
5. Inspecciona el detalle de salud con `docker inspect --format '{{json .State.Health}}' proyecto-db-1`.

## Errores comunes

- **`api` arranca antes de que la BBDD acepte conexiones**: usaste `depends_on` simple. Anade `condition: service_healthy` y un `healthcheck` real en la dependencia.
- **El healthcheck siempre `unhealthy`**: el comando de `test` falla. Pruebalo dentro del contenedor (`docker compose exec db pg_isready -U postgres`) y ajusta usuario/host.
- **`target` no encontrado**: el nombre de etapa en `build.target` no coincide con ningun `AS <nombre>` del Dockerfile.
- **Cambios en el Dockerfile no se reflejan**: `up` reutiliza la imagen; fuerza la reconstruccion con `docker compose up --build` o `docker compose build`.

> Idea clave: define cada contenedor en `services`, construye con `build` (context/target/args) y, para que un servicio espere a otro **listo**, combina `depends_on: condition: service_healthy` con un `healthcheck`.
