---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos sobre BuildKit, buildx, multi-arquitectura, secrets, SSH mounts y bake."
---

# Examen práctico

Este examen comprueba si sabes usar BuildKit y buildx para builds reproducibles, cacheables y preparados para CI.

## Retos

### Reto 1: builder y plataforma

```compare
# CMD
docker buildx create --name examen-builder --driver docker-container --use
docker buildx inspect --bootstrap
# OUT
examen-builder
Name:          examen-builder
Driver:        docker-container
Platforms:     linux/amd64, linux/arm64, ...
```

Explica por qué el driver `docker-container` importa para multi-arquitectura.

### Reto 2: build multi-arquitectura de ejemplo

```compare
# CMD
cd examples/multi-arch
docker buildx build --platform linux/amd64 -t curso/examen-multiarch:local --load .
docker run --rm curso/examen-multiarch:local
# OUT
TARGETPLATFORM=linux/amd64 | TARGETOS=linux | TARGETARCH=amd64
uname -m: x86_64
```

Si tu host no es amd64, ajusta la plataforma o espera emulación.

### Reto 3: bake y caché

```compare
# CMD
cd ../buildx-bake
docker buildx bake --print
docker buildx bake --load
# OUT
{
  "group": {
    "default": ...
  }
}
[+] Building 2/2
...
```

Explica cuándo usarías `bake` en vez de varios comandos `docker buildx build`.

## Checklist de autoevalúación

- Sé activar BuildKit y reconocer features `RUN --mount`.
- Sé crear, usar, inspeccionar y borrar builders.
- Sé explicar `--platform`, `--push`, `--load` y manifest lists.
- Sé usar secrets/SSH mounts sin persistir credenciales.
- Sé leer y ejecutar un `docker-bake.hcl`.

## Limpieza

```bash
docker buildx rm examen-builder 2>/dev/null || true
docker image rm curso/examen-multiarch:local curso/bake-app:1.0 curso/bake-worker:1.0 2>/dev/null || true
```

> Resultado esperado: puedes preparar builds avanzados para distintas arquitecturas y CI sin sacrificar seguridad ni caché.
