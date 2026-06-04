# Build multi-arquitectura con buildx

Imagen sencilla que imprime la **arquitectura destino** usando los ARG automáticos de BuildKit (`TARGETPLATFORM`, `TARGETARCH`, `TARGETOS`).

## Que demuestra

- Uso de los ARG automáticos que `buildx` inyecta según la plataforma.
- Construir una sola imagen para varias arquitecturas (`linux/amd64`, `linux/arm64`).
- Inspeccionar el manifest multi-arquitectura resultante.

## 1) Crear y usar un builder con buildx

```bash
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap
```

## 2a) Build de prueba en TU arquitectura (carga local)

`--load` solo admite una plataforma; sirve para probar en local:

```bash
docker buildx build --load -t curso/multi-arch .
docker run --rm curso/multi-arch
```

Salida (ejemplo en un host arm64):

```
TARGETPLATFORM=linux/arm64 | TARGETOS=linux | TARGETARCH=arm64
uname -m: aarch64
```

## 2b) Build multi-arquitectura real

Para varias plataformas a la vez hay que **publicar** (`--push`) a un registry,
porque el store local de imágenes no guarda manifests multi-arch:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t TU_USUARIO/multi-arch:latest \
  --push .
```

Si no quieres publicar, exporta a la cache OCI local:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t curso/multi-arch:latest \
  -o type=oci,dest=multi-arch.tar .
```

## 3) Inspeccionar el manifest multi-arquitectura

```bash
# Requiere haberla publicado (--push)
docker buildx imagetools inspect TU_USUARIO/multi-arch:latest
```

Veras una entrada por plataforma (amd64 y arm64).

## Limpiar

```bash
docker buildx rm multiarch
```
