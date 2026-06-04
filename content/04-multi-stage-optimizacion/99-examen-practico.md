---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos para optimizar imágenes con multi-stage, bases mínimas, .dockerignore y caché de build."
---

# Examen práctico

Este examen usa `examples/go-multi-stage/` para comprobar si sabes reducir tamaño sin perder reproducibilidad. Puedes usarlo desde este repo o clonarlo en una máquina de pruebas:

```bash
git clone https://github.com/amcgiluma/curso_docker.git
cd curso_docker/examples/go-multi-stage
```

## Retos

### Reto 1: compara stages

```compare
# CMD
cd examples/go-multi-stage
docker build --target build -t curso/examen-go:builder .
docker build -t curso/examen-go:alpine .
docker images curso/examen-go --format "{{.Repository}}:{{.Tag}} {{.Size}}"
# OUT
curso/examen-go:alpine <tamaño>
curso/examen-go:builder <tamaño>
```

Explica por qué la imagen `builder` es mucho mayor que la final.

### Reto 2: compara bases

```compare
# CMD
docker build -f Dockerfile.scratch -t curso/examen-go:scratch .
docker run --rm curso/examen-go:scratch
docker run --rm --entrypoint sh curso/examen-go:scratch
# OUT
hola desde Go en Docker
arch=<arch> os=linux
docker: Error response from daemon: ...
exec: "sh": executable file not found in $PATH
```

Explica cuándo elegirías `scratch` y cuándo preferirías Alpine.

### Reto 3: detecta grasa en capas

```compare
# CMD
docker history curso/examen-go:alpine --format "{{.Size}}\t{{.CreatedBy}}"
# OUT
<size>  COPY /bin/app /usr/local/bin/app # buildkit
...
```

Identifica qué capas aportan tamaño real y cuáles son solo metadatos.

## Checklist de autoevalúación

- Sé usar `COPY --from`, `--target` y nombres de etapa.
- Sé comparar bases Alpine, slim, distroless y scratch con criterios técnicos.
- Sé usar `.dockerignore`, `docker history` y `docker images` para medir.
- Sé explicar cuándo una optimización reduce peso real y cuándo solo cambia apariencia.

## Limpieza

```bash
docker image rm curso/examen-go:builder curso/examen-go:alpine curso/examen-go:scratch 2>/dev/null || true
```

> Resultado esperado: puedes convertir un build con toolchain en una imagen final pequeña, medible y razonada.
