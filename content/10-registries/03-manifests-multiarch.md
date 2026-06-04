---
title: "Imágenes multi-arquitectura con manifests"
slug: "manifests-multiarch"
order: 3
summary: "docker manifest e imágenes multi-arch: cómo un mismo tag sirve amd64 y arm64."
---

# Imágenes multi-arquitectura con manifests

Cuando haces `docker pull node:22` desde un Mac M-series y desde un servidor x86, recibes binarios distintos pese a usar el mismo tag. Eso es magia de las **listas de manifests**. Aquí verás cómo inspeccionarlas y crear las tuyas.

## Teoría

Detras de un tag puede haber dos cosas:

- Un **manifest** simple: describe **una** imagen para **una** arquitectura (lista sus capas y su config).
- Una **lista de manifests** (manifest list / OCI image index): un índice que apunta a varios manifests, uno por plataforma (`linux/amd64`, `linux/arm64`, ...).

Cuando haces `pull`, el cliente Docker envía su plataforma y el registro le devuelve, desde la lista, el manifest que corresponde a su `os/arch`. Por eso un mismo `node:22` funciona en x86 y en ARM.

| Concepto | Qué es |
| --- | --- |
| Manifest | Descriptor de UNA imagen para UNA plataforma |
| Manifest list / index | Índice que mapea plataforma -> manifest |
| Digest (`sha256:...`) | Identificador inmutable de un manifest o de una lista |
| Plataforma | Par `os/arch[/variant]`, p. ej. `linux/arm64/v8` |

> Nota: `docker manifest` es un comando **experimental** del CLI. Activalo con `export DOCKER_CLI_EXPERIMENTAL=enabled` (o `"experimental": "enabled"` en `~/.docker/config.json`). La forma moderna y recomendada de **construir** multi-arch es `docker buildx`.

## Manos a la obra

Inspecciona la lista de manifests de una imagen oficial y mira las plataformas que ofrece:

```compare
# CMD
docker manifest inspect node:22-alpine
# OUT
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.oci.image.index.v1+json",
  "manifests": [
    {
      "mediaType": "application/vnd.oci.image.manifest.v1+json",
      "digest": "sha256:<digest-amd64>",
      "platform": { "architecture": "amd64", "os": "linux" }
    },
    {
      "digest": "sha256:<digest-arm64>",
      "platform": { "architecture": "arm64", "os": "linux", "variant": "v8" }
    }
  ]
}
```

Construye y publica una imagen multi-arch con **buildx** (lo más sencillo hoy en dia):

```compare
# CMD
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <tu-usuario>/hola-multiarch:1.0 \
  --push .
# OUT
[+] Building 18.4s (15/15) FINISHED
 => pushing manifest for docker.io/<tu-usuario>/hola-multiarch:1.0
```

También puedes ensamblar una lista a mano con `docker manifest`, partiendo de imágenes por arquitectura ya publicadas:

```compare
# CMD
docker manifest create <tu-usuario>/app:1.0 \
  <tu-usuario>/app:1.0-amd64 \
  <tu-usuario>/app:1.0-arm64
docker manifest push <tu-usuario>/app:1.0
# OUT
Created manifest list docker.io/<tu-usuario>/app:1.0
sha256:<digest-de-la-lista>
```

Comprueba qué estás corriendo el binario de tu arquitectura:

```compare
# CMD
docker run --rm <tu-usuario>/hola-multiarch:1.0 uname -m
# OUT
aarch64
# (x86_64 en una máquina amd64)
```

## Flags y variantes

| Comando / flag | Para qué sirve |
| --- | --- |
| `docker manifest inspect <img>` | Muestra el manifest o la lista de una imagen |
| `docker manifest inspect --verbose <img>` | Añade el digest y el descriptor de cada plataforma |
| `docker manifest create <lista> <img...>` | Crea una lista local a partir de imágenes por arch |
| `docker manifest annotate <lista> <img> --arch arm64 --os linux` | Ajusta la plataforma de una entrada |
| `docker manifest push <lista>` | Sube la lista al registro |
| `docker buildx build --platform <p1,p2>` | Construye para varias plataformas a la vez |
| `docker buildx build --push` | Publica la imagen multi-arch (requerido para multi-plataforma) |
| `docker buildx imagetools inspect <img>` | Inspecciona la lista sin modo experimental |
| `docker pull --platform linux/amd64 <img>` | Fuerza la plataforma al descargar |

> Nota: con `buildx` y multiples plataformas necesitas `--push` (o `--output`), porque la cache local de Docker no almacena listas multi-arch directamente como una imagen cargable con `--load`.

## Pruébalo tú

1. Activa el modo experimental del CLI: `export DOCKER_CLI_EXPERIMENTAL=enabled`.
2. Inspecciona una imagen oficial: `docker manifest inspect alpine:3.20` y cuenta cuantas plataformas trae.
3. Crea un builder de buildx: `docker buildx create --name multi --use`.
4. Construye y publica una imagen propia: `docker buildx build --platform linux/amd64,linux/arm64 -t <tu-usuario>/demo:1.0 --push .`.
5. Verifica el resultado con `docker buildx imagetools inspect <tu-usuario>/demo:1.0`.
6. Reto: ejecuta `docker run --rm <tu-usuario>/demo:1.0 uname -m` y compara con `docker run --rm --platform linux/amd64 <tu-usuario>/demo:1.0 uname -m`.

## Errores comunes

- **`docker manifest is only supported when experimental is enabled`**: activa `DOCKER_CLI_EXPERIMENTAL=enabled` o pon `"experimental": "enabled"` en `~/.docker/config.json`.
- **`buildx` falla con `--load` y varias plataformas**: el daemon clásico no puede cargar una lista multi-arch. Usa `--push` a un registro, o construye una sola plataforma para `--load`.
- **`exec format error` al correr la imagen**: estás ejecutando un binario de otra arquitectura (p. ej. arm64 en x86) sin emulación. Construye también para tu plataforma o instala QEMU (`docker run --privileged tonistiigi/binfmt --install all`).
- **La lista apunta a digests que no existen**: si borras una de las imágenes por arquitectura del registro, el `pull` de esa plataforma fallara. Mantén todas las variantes publicadas.

> Idea clave: un tag puede ser una lista de manifests que mapea cada plataforma a su imagen concreta. `docker manifest inspect` te la muestra y `docker buildx build --platform ... --push` es la forma moderna de crear imágenes que funcionan en amd64 y arm64 con un solo tag.
