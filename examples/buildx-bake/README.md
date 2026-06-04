# buildx bake

Ejemplo mínimo para prácticar `docker buildx bake`, targets, grupos y cache local.

## Ver la configuración resuelta

```bash
docker buildx bake --print
```

## Construir los targets locales

```bash
docker buildx bake --load
docker run --rm curso/bake-app:1.0
docker run --rm curso/bake-worker:1.0
```

## Probar cache local

```bash
docker buildx build --cache-to type=local,dest=.buildcache -t curso/bake-app:cache --load .
docker buildx build --cache-from type=local,src=.buildcache -t curso/bake-app:cache --load .
```

## Preparar un build multi-arquitectura

El target `multiarch` está pensado para publicar en un registro. Sustituye `<usuario>` por tu usuario de Docker Hub:

```bash
docker buildx bake multiarch --push
```
