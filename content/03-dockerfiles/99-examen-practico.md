---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos para escribir Dockerfiles correctos, cacheables y con metadatos útiles."
---

# Examen práctico

Este examen comprueba si sabes construir una imagen sencilla con buen contexto, buen orden de capas y runtime predecible.

## Retos

### Reto 1: crea una imagen mínima

En una carpeta temporal, crea este `Dockerfile`:

```dockerfile
FROM alpine:3.20
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
WORKDIR /app
COPY app/ ./app/
CMD ["sh", "-c", "echo version=$APP_VERSION && ls -la /app/app"]
```

Crea también `app/index.html` con cualquier contenido y construye:

```compare
# CMD
docker build --build-arg APP_VERSION=1.0.0 -t curso/examen-dockerfile:1.0 .
docker run --rm curso/examen-dockerfile:1.0
# OUT
version=1.0.0
total <n>
...
index.html
```

### Reto 2: controla el contexto

```compare
# CMD
echo node_modules > .dockerignore
mkdir node_modules
echo basura > node_modules/demo.txt
docker build -t curso/examen-dockerfile:cache .
# OUT
[+] Building ...
 => transferring context: <tamaño>
...
```

Explica por qué `node_modules/demo.txt` no debe viajar al daemon.

### Reto 3: runtime y señales

Modifica el `CMD` para usar exec form y compara con shell form. Luego ejecuta:

```compare
# CMD
docker run -d --name examen-dockerfile curso/examen-dockerfile:1.0 sleep 300
docker stop examen-dockerfile
# OUT
<container-id>
examen-dockerfile
```

Explica qué proceso recibe la señal y por qué importa en producción.

## Checklist de autoevalúación

- Sé decidir cuándo usar `RUN`, `COPY`, `ADD`, `CMD`, `ENTRYPOINT`, `ARG`, `ENV`, `WORKDIR`, `USER`, `EXPOSE`, `LABEL` y `HEALTHCHECK`.
- Sé ordenar capas para aprovechar caché.
- Sé escribir `.dockerignore` para reducir contexto y evitar secretos.
- Sé explicar exec form frente a shell form.

## Limpieza

```bash
docker rm -f examen-dockerfile 2>/dev/null || true
docker image rm curso/examen-dockerfile:1.0 curso/examen-dockerfile:cache 2>/dev/null || true
```

> Resultado esperado: puedes escribir un Dockerfile reproducible y explicar cómo afecta cada instrucción al build y al runtime.
