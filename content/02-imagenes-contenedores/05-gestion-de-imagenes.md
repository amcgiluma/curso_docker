---
title: "Gestión de imágenes"
slug: "gestion-de-imagenes"
order: 5
summary: "images, pull, push, tag, rmi, save, load, history y prune."
---

# Gestión de imágenes

Las imágenes son la unidad que descargas, etiquetas, publicas y limpias. Estos comandos cubren todo su ciclo: traerlas de un registro, versiónarlas, moverlas como fichero y liberar espacio.

## Teoría

Una referencia de imagen tiene la forma `[registro/]repositorio[:tag]`. Si omites el tag, Docker asume `:latest` (que **no** significa "la más nueva", solo es un tag por defecto). Si omites el registro, usa Docker Hub.

Comandos principales:

- **`docker images`**: lista las imágenes locales.
- **`docker pull` / `push`**: descarga de / sube a un registro. `push` requiere `docker login` y un tag con tu usuario/registro.
- **`docker tag`**: crea otra referencia (nombre/tag) que apunta a la **misma** imagen (no la duplica en disco).
- **`docker rmi`**: borra una imagen local (si ningun contenedor la usa).
- **`docker save` / `load`**: exporta/importa imágenes a un `.tar` (útil sin red).
- **`docker history`**: muestra las capas.
- **`docker image prune`**: borra imágenes colgadas (`dangling`) o no usadas.

> `tag` solo crea un alias: la misma imagen puede tener varios nombres. Borrar un alias con `rmi` no borra la imagen mientras quede otra referencia apuntando a ella.

## Manos a la obra

Descargar una versión concreta y listarla:

```compare
# CMD
docker pull alpine:3.20
docker images alpine
# OUT
3.20: Pulling from library/alpine
<hash>: Pull complete
Digest: sha256:<hash>
Status: Downloaded newer image for alpine:3.20
docker.io/library/alpine:3.20
REPOSITORY   TAG    IMAGE ID       CREATED       SIZE
alpine       3.20   <hash>         3 weeks ago   8.17MB
```

Crear un alias con `tag` (apunta a la misma imagen, mismo ID):

```compare
# CMD
docker tag alpine:3.20 miusuario/alpine:prueba
docker images --format "{{.Repository}}:{{.Tag}} -> {{.ID}}"
# OUT
alpine:3.20 -> <hash>
miusuario/alpine:prueba -> <hash>
```

Exportar a un tar y volver a cargarlo (offline):

```compare
# CMD
docker save -o alpine.tar alpine:3.20
docker rmi alpine:3.20
docker load -i alpine.tar
# OUT
Untagged: alpine:3.20
Loaded image: alpine:3.20
```

Limpiar lo que sobra:

```compare
# CMD
docker image prune -f
# OUT
Deleted Images:
deleted: sha256:<hash>
Total reclaimed space: 142MB
# (el espacio varía según tu entorno)
```

## Flags y variantes

| Comando | Flag | Para qué sirve |
| --- | --- | --- |
| `docker images` | `-a` | Incluye capas intermedias |
| `docker images` | `-q` | Solo IDs |
| `docker images` | `--filter "dangling=true"` | Imágenes colgadas (sin tag) |
| `docker images` | `--format "..."` | Columnas a medida |
| `docker pull` | `--platform linux/arm64` | Fuerza una arquitectura |
| `docker pull` | `-a` | Todos los tags del repositorio |
| `docker push` | `--all-tags` | Sube todos los tags |
| `docker tag` | — | `docker tag origen nuevo:tag` |
| `docker rmi` | `-f` | Fuerza el borrado |
| `docker save` | `-o fichero.tar` | Exporta imagen(es) a tar |
| `docker load` | `-i fichero.tar` | Importa desde tar |
| `docker history` | `--no-trunc` | Comandos completos por capa |
| `docker image prune` | `-a` | Borra todas las no usadas, no solo dangling |
| `docker image prune` | `-f` | Sin pedir confirmacion |
| `docker login` | `-u <usuario>` | Autentica contra el registro antes de push |

## Pruébalo tú

1. Descarga `docker pull alpine:3.20` y mira su tamaño con `docker images alpine`.
2. Crea un alias con `docker tag alpine:3.20 miusuario/alpine:prueba` y comprueba que comparten ID.
3. Exporta con `docker save -o alpine.tar alpine:3.20`, borra la imagen y recuperala con `docker load -i alpine.tar`.
4. Mira las capas con `docker history alpine:3.20 --no-trunc`.
5. Libera espacio con `docker image prune` y, con cuidado, prueba `docker system df` antes y después.

## Errores comunes

- **`denied: requested access to the resource is denied` al hacer push**: falta `docker login` o el tag no lleva tu usuario/registro (`docker tag img miusuario/img:tag`).
- **`image is being used by running container` al hacer rmi**: para y borra los contenedores que la usan, o usa `-f` con cuidado.
- **Creer que `tag` copia la imagen**: solo crea otra referencia; el disco no crece.
- **`docker save` vs `docker export`**: `save` guarda **imágenes** con sus capas; `export` aplana el **sistema de ficheros de un contenedor** (pierde historial). No los confundas.
- **`prune -a` agresivo**: borra imágenes sin contenedor asociado, incluidas las que querias conservar. Revisa antes con `docker images`.

> Idea clave: `pull`/`push` mueven imágenes entre tu máquina y un registro; `tag` solo crea alias a la misma imagen; `save`/`load` las llevan como `.tar` sin red; y `prune` libera espacio. `latest` es un tag por defecto, no garantía de "lo más nuevo".
