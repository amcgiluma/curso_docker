---
title: "Cache export/import y buildx bake"
slug: "bake"
order: 4
summary: "Compartir caché con --cache-to/--cache-from y orquestar builds con docker buildx bake."
---

# Cache export/import y buildx bake

Dos piezas finales del build avanzado: **exportar e importar la caché** para acelerar builds en CI o entre máquinas, y **`docker buildx bake`**, que define varios builds en un fichero declarativo y los lanza juntos.

## Teoría

**Cache export/import**: BuildKit guarda caché localmente, pero en CI cada ejecución empieza limpia. Con `--cache-to` exportas la caché (a un registro o a disco) y con `--cache-from` la reútilizas en el siguiente build, evitando rehacer pasos.

Tipos de caché habituales:

- **`type=registry`**: guarda/lee la caché en un registro (ideal para CI; persiste entre runners).
- **`type=local`**: guarda/lee la caché en un directorio del host.
- **`type=gha`**: caché de GitHub Actions.
- **`mode=max`**: exporta caché de **todas** las etapas (incluidas las intermedias del multi-stage); `mode=min` (por defecto) solo las de la imagen final.

**`docker buildx bake`**: en vez de invocar `docker buildx build` muchas veces, defines los objetivos (`target`) en un fichero `docker-bake.hcl` (o `compose.yaml`) y los construyes con un solo comando. Permite reútilizar configuración, variables y grupos de targets.

El ejemplo completo está en `examples/buildx-bake/` e incluye `Dockerfile`, `Dockerfile.worker` y `docker-bake.hcl`.

> En CI, `--cache-to type=registry,mode=max` + `--cache-from type=registry` suele ser la combinación más efectiva: la caché vive en el registro y se comparte entre ejecuciónes y máquinas.

## Manos a la obra

Entra en el ejemplo:

```bash
cd examples/buildx-bake
```

Exporta la caché local mientras construyes:

```compare
# CMD
docker buildx build \
  --cache-to type=local,dest=.buildcache \
  -t curso/bake-app:cache \
  --load .
# OUT
[+] Building ...
 => exporting to docker image format
 => => naming to docker.io/curso/bake-app:cache
 => => exporting cache to client directory
```

Reconstruye importando esa caché:

```compare
# CMD
docker buildx build \
  --cache-from type=local,src=.buildcache \
  -t curso/bake-app:cache \
  --load .
# OUT
[+] Building ...
 => importing cache manifest from local directory
 => CACHED [2/2] RUN echo "Construyendo app..."
```

El `docker-bake.hcl` del ejemplo define dos targets y un grupo:

```hcl
group "default" {
  targets = ["app", "worker"]
}

target "app" {
  context    = "."
  dockerfile = "Dockerfile"
  tags       = ["curso/bake-app:1.0"]
  platforms  = ["linux/amd64"]
}

target "worker" {
  context    = "."
  dockerfile = "Dockerfile.worker"
  tags       = ["curso/bake-worker:1.0"]
  platforms  = ["linux/amd64"]
}
```

Mira la configuración resuelta antes de construir:

```compare
# CMD
docker buildx bake --print
# OUT
{
  "group": {
    "default": {
      "targets": ["app", "worker"]
    }
  },
  "target": {
    "app": { ... },
    "worker": { ... }
  }
}
```

Lanza todos los targets del grupo con un comando:

```compare
# CMD
docker buildx bake --load
# OUT
[+] Building 2/2
 ✔ app     Built
 ✔ worker  Built
```

Construye solo un target concreto:

```compare
# CMD
docker buildx bake app --load
# OUT
[+] Building 1/1
 ✔ app  Built
```

## Flags y variantes

| Elemento | Qué hace |
| --- | --- |
| `--cache-to type=registry,ref=<img>,mode=max` | Exporta la caché (todas las etapas) a un registro |
| `--cache-to type=local,dest=<dir>` | Exporta la caché a un directorio del host |
| `--cache-from type=registry,ref=<img>` | Importa caché desde un registro |
| `--cache-from type=local,src=<dir>` | Importa caché desde un directorio |
| `mode=min` / `mode=max` | Exporta solo la imagen final / todas las etapas |
| `docker buildx bake` | Construye el grupo `default` del fichero bake |
| `docker buildx bake <target>` | Construye un target concreto |
| `docker buildx bake -f <fichero>` | Usa un fichero bake específico |
| `docker buildx bake --print` | Muestra la config resuelta sin construir |
| `docker buildx bake --push` / `--load` | Publica / carga el resultado |

## Pruébalo tú

1. Entra en `examples/buildx-bake`.
2. Ejecuta `docker buildx bake --print` para validar la configuración.
3. Construye con caché local: `docker buildx build --cache-to type=local,dest=.buildcache -t curso/bake-app:cache --load .`.
4. Reconstruye importando la caché: `docker buildx build --cache-from type=local,src=.buildcache -t curso/bake-app:cache --load .`.
5. Lanza `docker buildx bake --load` y comprueba que genera `curso/bake-app:1.0` y `curso/bake-worker:1.0`.
6. Ejecuta ambos contenedores con `docker run --rm curso/bake-app:1.0` y `docker run --rm curso/bake-worker:1.0`.

## Errores comunes

- **La caché no se reútiliza en CI**: usaste `type=local` pero el runner no conserva el directorio. Usa `type=registry` (o `type=gha` en GitHub Actions) para que persista entre ejecuciónes.
- **`mode=max` requiere builder docker-container**: la exportación de caché completa no funciona con el builder `default`. Crea uno con `--driver docker-container`.
- **`docker buildx bake: no such target`**: el nombre no existe en el fichero o no está en el grupo `default`. Revisa con `docker buildx bake --print`.
- **`--cache-to` a un registro sin permisos**: necesitas `docker login` y permiso de escritura en ese repositorio de caché.

> Idea clave: comparte caché entre builds con `--cache-from`/`--cache-to` (usa `type=registry,mode=max` en CI) y orquesta múltiples builds de forma declarativa con `docker buildx bake` y su fichero `docker-bake.hcl`.
