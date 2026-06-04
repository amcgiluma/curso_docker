---
title: "buildx y builds multi-arquitectura"
slug: "buildx-multiarch"
order: 2
summary: "docker buildx, --platform, builders y construcción para varias arquitecturas."
---

# buildx y builds multi-arquitectura

`docker buildx` es la CLI extendida de BuildKit. Su gran aporte es construir una **misma imagen para varias arquitecturas** (amd64, arm64...) en una sola invocacion, algo imprescindible hoy con servidores ARM y Apple Silicon.

## Teoría

Una imagen normal sirve para una sola arquitectura. Una **imagen multi-arquitectura** es realmente un *manifest list*: un índice que apunta a varias imágenes (una por plataforma). Al hacer `docker pull`, Docker elige automáticamente la que corresponde a tu CPU.

`buildx` usa **builders**. El builder por defecto (`default`) usa el daemon clásico y no puede hacer multi-arch ni emulación. Para multi-arquitectura creas un builder con el driver `docker-container`, que soporta QEMU para emular otras CPUs.

Conceptos clave:

- **`--platform linux/amd64,linux/arm64`**: lista de plataformas objetivo.
- **Emulacion QEMU**: permite construir arm64 desde una máquina amd64 (y viceversa).
- **`--push` vs `--load`**: una imagen multi-arch no se puede `--load` al daemon local (qué es de una sola arquitectura); normalmente se hace `--push` directo al registro.

> Para una sola plataforma puedes `--load` la imagen al daemon local; para varias plataformas a la vez necesitas `--push` a un registro, porque el daemon local no almacena manifest lists multi-arch.

## Manos a la obra

Usa el ejemplo ya preparado en el repositorio:

```bash
cd examples/multi-arch
```

Crea y activa un builder capaz de multi-arch:

```compare
# CMD
docker buildx create --name multi --driver docker-container --use
docker buildx inspect --bootstrap
# OUT
[+] Building 0.0s
Name:          multi
Driver:        docker-container
...
Platforms:     linux/amd64, linux/arm64, linux/arm/v7, ...
```

Construye para dos arquitecturas y publica en un registro:

```compare
# CMD
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <usuario>/miapp:1.0 \
  --push .
# OUT
 => [linux/amd64 1/3] FROM ...
 => [linux/arm64 1/3] FROM ...
 => exporting to image
 => => pushing manifest for docker.io/<usuario>/miapp:1.0
```

Comprueba que la imagen publicada es multi-arquitectura:

```compare
# CMD
docker buildx imagetools inspect <usuario>/miapp:1.0
# OUT
Name:      docker.io/<usuario>/miapp:1.0
MediaType: application/vnd.oci.image.index.v1+json
Manifests:
  Platform:  linux/amd64
  Platform:  linux/arm64
```

## Flags y variantes

| Comando / flag | Qué hace |
| --- | --- |
| `docker buildx create --name <n> --driver docker-container` | Crea un builder con soporte multi-arch |
| `docker buildx create --use` | Crea y lo selecciona como activo |
| `docker buildx use <n>` | Cambia el builder activo |
| `docker buildx ls` | Lista builders y sus plataformas |
| `docker buildx inspect --bootstrap` | Arranca e inspecciona el builder |
| `--platform linux/amd64,linux/arm64` | Plataformas objetivo |
| `--push` | Publica la imagen (necesario para multi-arch) |
| `--load` | Carga la imagen al daemon local (solo una plataforma) |
| `docker buildx imagetools inspect <img>` | Inspecciona el manifest (plataformas incluidas) |
| `docker buildx rm <n>` | Elimina un builder |

## Pruébalo tú

1. Crea el builder: `docker buildx create --name multi --driver docker-container --use`.
2. Arráncalo: `docker buildx inspect --bootstrap` y fíjate en las plataformas soportadas.
3. Entra en `examples/multi-arch` y construye para una sola plataforma cargándola en local: `docker buildx build --platform linux/amd64 -t miapp:local --load .`.
4. Para multi-arch necesitas un registro: `docker login` y luego `docker buildx build --platform linux/amd64,linux/arm64 -t <usuario>/miapp:1.0 --push .`.
5. Verifica el manifest con `docker buildx imagetools inspect <usuario>/miapp:1.0`.

## Errores comunes

- **`docker exporter does not currently support exporting manifest lists`** al usar `--load` con varias plataformas: el daemon local no guarda manifest lists. Construye una sola plataforma para `--load`, o usa `--push` para multi-arch.
- **`multiple platforms feature is currently not supported for docker driver`**: el builder `default` no vale para multi-arch. Crea uno con `--driver docker-container`.
- **Build arm64 muy lento en máquina amd64**: es la emulación QEMU; es esperable. Para CI considera runners nativos por arquitectura.
- **`no match for platform in manifest`** al hacer pull: la imagen no incluye tu arquitectura. Reconstruye añadiendola a `--platform`.

> Idea clave: con `docker buildx` y un builder `docker-container` construyes imágenes multi-arquitectura (`--platform`) que se publican como manifest list con `--push`; el daemon local solo puede `--load` una plataforma.
