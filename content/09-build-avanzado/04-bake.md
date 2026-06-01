---
title: "Cache export/import y buildx bake"
slug: "bake"
order: 4
summary: "Compartir cache con --cache-to/--cache-from y orquestar builds con docker buildx bake."
---

# Cache export/import y buildx bake

Dos piezas finales del build avanzado: **exportar e importar la cache** para acelerar builds en CI o entre maquinas, y **`docker buildx bake`**, que define varios builds en un fichero declarativo y los lanza juntos.

## Teoria

**Cache export/import**: BuildKit guarda cache localmente, pero en CI cada ejecucion empieza limpia. Con `--cache-to` exportas la cache (a un registro o a disco) y con `--cache-from` la reutilizas en el siguiente build, evitando rehacer pasos.

Tipos de cache habituales:

- **`type=registry`**: guarda/lee la cache en un registro (ideal para CI; persiste entre runners).
- **`type=local`**: guarda/lee la cache en un directorio del host.
- **`type=gha`**: cache de GitHub Actions.
- **`mode=max`**: exporta cache de **todas** las etapas (incluidas las intermedias del multi-stage); `mode=min` (por defecto) solo las de la imagen final.

**`docker buildx bake`**: en vez de invocar `docker buildx build` muchas veces, defines los objetivos (`target`) en un fichero `docker-bake.hcl` (o `compose.yaml`) y los construyes con un solo comando. Permite reutilizar configuracion, variables y grupos de targets.

> En CI, `--cache-to type=registry,mode=max` + `--cache-from type=registry` suele ser la combinacion mas efectiva: la cache vive en el registro y se comparte entre ejecuciones y maquinas.

## Manos a la obra

Exporta la cache a un registro mientras construyes:

```compare
# CMD
docker buildx build \
  --cache-to type=registry,ref=<usuario>/miapp:buildcache,mode=max \
  --cache-from type=registry,ref=<usuario>/miapp:buildcache \
  -t <usuario>/miapp:1.0 \
  --push .
# OUT
 => importing cache manifest from <usuario>/miapp:buildcache
 => exporting to image
 => => exporting cache to registry
 => => pushing manifest for docker.io/<usuario>/miapp:1.0
```

Un fichero `docker-bake.hcl` con dos targets y un grupo:

```hcl
group "default" {
  targets = ["app", "worker"]
}

target "app" {
  context    = "."
  dockerfile = "Dockerfile"
  tags       = ["miapp:1.0"]
  platforms  = ["linux/amd64", "linux/arm64"]
}

target "worker" {
  context    = "."
  dockerfile = "Dockerfile.worker"
  tags       = ["miworker:1.0"]
}
```

Lanza todos los targets del grupo con un comando:

```compare
# CMD
docker buildx bake
# OUT
[+] Building 2/2
 ✔ app     Built
 ✔ worker  Built
```

Construye solo un target concreto:

```compare
# CMD
docker buildx bake app
# OUT
[+] Building 1/1
 ✔ app  Built
```

## Flags y variantes

| Elemento | Que hace |
| --- | --- |
| `--cache-to type=registry,ref=<img>,mode=max` | Exporta la cache (todas las etapas) a un registro |
| `--cache-to type=local,dest=<dir>` | Exporta la cache a un directorio del host |
| `--cache-from type=registry,ref=<img>` | Importa cache desde un registro |
| `--cache-from type=local,src=<dir>` | Importa cache desde un directorio |
| `mode=min` / `mode=max` | Exporta solo la imagen final / todas las etapas |
| `docker buildx bake` | Construye el grupo `default` del fichero bake |
| `docker buildx bake <target>` | Construye un target concreto |
| `docker buildx bake -f <fichero>` | Usa un fichero bake especifico |
| `docker buildx bake --print` | Muestra la config resuelta sin construir |
| `docker buildx bake --push` / `--load` | Publica / carga el resultado |

## Pruebalo tu

1. Construye una vez exportando cache local: `docker buildx build --cache-to type=local,dest=.buildcache -t miapp:1.0 --load .`.
2. Borra la imagen y reconstruye importando la cache: `docker buildx build --cache-from type=local,src=.buildcache -t miapp:1.0 --load .`; debe reutilizar pasos.
3. Crea un `docker-bake.hcl` con el target `app` del ejemplo.
4. Ejecuta `docker buildx bake --print` para ver la configuracion resuelta (sin construir).
5. Lanza `docker buildx bake app` y comprueba que genera la imagen `miapp:1.0`.

## Errores comunes

- **La cache no se reutiliza en CI**: usaste `type=local` pero el runner no conserva el directorio. Usa `type=registry` (o `type=gha` en GitHub Actions) para que persista entre ejecuciones.
- **`mode=max` requiere builder docker-container**: la exportacion de cache completa no funciona con el builder `default`. Crea uno con `--driver docker-container`.
- **`docker buildx bake: no such target`**: el nombre no existe en el fichero o no esta en el grupo `default`. Revisa con `docker buildx bake --print`.
- **`--cache-to` a un registro sin permisos**: necesitas `docker login` y permiso de escritura en ese repositorio de cache.

> Idea clave: comparte cache entre builds con `--cache-from`/`--cache-to` (usa `type=registry,mode=max` en CI) y orquesta multiples builds de forma declarativa con `docker buildx bake` y su fichero `docker-bake.hcl`.
