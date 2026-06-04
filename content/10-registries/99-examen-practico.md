---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos sobre tagging, push/pull, registry privado y manifests multi-arquitectura."
---

# Examen práctico

Este examen comprueba si entiendes cómo se nombran, publican e inspeccionan imágenes.

## Retos

### Reto 1: tags locales

```compare
# CMD
docker pull alpine:3.20
docker tag alpine:3.20 localhost:5000/examen/alpine:3.20
docker image ls --format "{{.Repository}}:{{.Tag}} {{.ID}}" | grep "alpine"
# OUT
alpine:3.20 <image-id>
localhost:5000/examen/alpine:3.20 <image-id>
```

Explica por qué `docker tag` no copia capas.

### Reto 2: registry privado local

```compare
# CMD
docker volume create registry-data
docker run -d -p 5000:5000 --name examen-registry -v registry-data:/var/lib/registry registry:2
docker push localhost:5000/examen/alpine:3.20
# OUT
registry-data
<container-id>
The push refers to repository [localhost:5000/examen/alpine]
...
```

### Reto 3: catálogo e inspección

```compare
# CMD
docker run --rm --network host alpine:3.20 wget -qO- http://localhost:5000/v2/_catalog
docker buildx imagetools inspect alpine:3.20
# OUT
{"repositories":["examen/alpine"]}
Name:      docker.io/library/alpine:3.20
MediaType: application/vnd.oci.image.index.v1+json
...
```

En Docker Desktop, si `--network host` no funciona, usa el navegador o `curl` desde el host.

## Checklist de autoevalúación

- Sé leer nombres de imagen con registro, namespace, repositorio y tag.
- Sé usar `login`, `tag`, `push`, `pull` y registry local.
- Sé explicar por qué un volumen mantiene los datos del registry.
- Sé diferenciar imagen por arquitectura y manifest list multi-arquitectura.

## Limpieza

```bash
docker rm -f examen-registry 2>/dev/null || true
docker volume rm registry-data 2>/dev/null || true
docker image rm localhost:5000/examen/alpine:3.20 2>/dev/null || true
```

> Resultado esperado: puedes publicar imágenes con nombres correctos e inspeccionar qué plataformas contiene un tag.
